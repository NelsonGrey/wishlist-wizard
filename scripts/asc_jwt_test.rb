#!/usr/bin/env ruby
require 'json'
require 'base64'
require 'openssl'
require 'net/http'

def base64url_encode(str)
  Base64.urlsafe_encode64(str).gsub('=', '')
end

key_b64 = ENV['ASC_PRIVATE_KEY']
kid = ENV['ASC_KEY_ID']
iss = ENV['ASC_ISSUER_ID']

if key_b64.nil? || kid.nil? || iss.nil?
  puts "Missing ASC_PRIVATE_KEY / ASC_KEY_ID / ASC_ISSUER_ID in environment; skipping test"
  exit 0
end

begin
  key_pem = Base64.decode64(key_b64)
  key = OpenSSL::PKey::EC.new(key_pem)
rescue => e
  puts "ERROR: Failed to load private key: #{e.message}"
  exit 1
end

iat = Time.now.to_i
exp = iat + 20 * 60
header = { alg: 'ES256', kid: kid, typ: 'JWT' }
payload = { iss: iss, iat: iat, exp: exp, aud: 'appstoreconnect-v1' }

header_segment = base64url_encode(header.to_json)
payload_segment = base64url_encode(payload.to_json)
data = [header_segment, payload_segment].join('.')

digest = OpenSSL::Digest::SHA256.new
asn1_signature = key.dsa_sign_asn1(digest.digest(data))
# Parse ASN.1 DER signature (r, s) and convert to raw R||S 64-byte value per RFC7515
seq = OpenSSL::ASN1.decode(asn1_signature)
r = seq.value[0].value
s = seq.value[1].value

def int_to_32byte_be(i)
  hex = i.to_s(16)
  hex = '0' + hex if hex.length.odd?
  bin = [hex].pack('H*')
  if bin.bytesize < 32
    bin = ("\x00" * (32 - bin.bytesize)) + bin
  elsif bin.bytesize > 32
    # If greater than 32 bytes, trim leading zeroes (shouldn't normally happen)
    bin = bin[-32, 32]
  end
  bin
end

r_bin = int_to_32byte_be(r)
s_bin = int_to_32byte_be(s)
signature = r_bin + s_bin
token = [data, base64url_encode(signature)].join('.')

puts "JWT iat=#{iat} exp=#{exp}"
puts "Testing App Store Connect API with generated token (status only)"

uri = URI('https://api.appstoreconnect.apple.com/v1/apps?limit=1')
req = Net::HTTP::Get.new(uri)
req['Authorization'] = "Bearer #{token}"
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true
res = http.request(req)
puts "App Store Connect response code: #{res.code}"
if res.code.to_i >= 400
  begin
    body = JSON.parse(res.body)
    puts "Response error summary: "; puts body['errors'] || body
  rescue
    puts "Response body: #{res.body[0..400]}"
  end
  exit 1
else
  puts "Auth test succeeded (expected for valid key/ids)"
end
