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
  # The ASC_PRIVATE_KEY secret may be provided as raw PEM or as a base64-encoded PEM.
  key_pem = if key_b64.strip.start_with?("-----BEGIN")
              key_b64
            else
              Base64.decode64(key_b64)
            end
  key = OpenSSL::PKey::EC.new(key_pem)
rescue => e
  puts "ERROR: Failed to load private key. Make sure ASC_PRIVATE_KEY is either a raw PEM or base64-encoded PEM; error: #{e.message}"
  exit 1
end

begin
  curve_name = key.group.curve_name if key.respond_to?(:group) && key.group.respond_to?(:curve_name)
  key_size = key.group.degree / 8 if key.respond_to?(:group) && key.group.respond_to?(:degree)
  alg = case curve_name
        when 'prime256v1' then 'ES256'
        when 'secp384r1' then 'ES384'
        when 'secp521r1' then 'ES512'
        else 'ES256' # fallback
        end
  puts "Key type: EC, curve: #{curve_name || 'unknown'}, size: #{key_size || 'unknown'} bytes, alg: #{alg}"
rescue
  alg = 'ES256' # fallback
  puts "Key type: EC, alg: #{alg} (fallback)"
end

iat = Time.now.to_i
exp = iat + 20 * 60
header = { alg: alg, kid: kid, typ: 'JWT' }
payload = { iss: iss, iat: iat, exp: exp, aud: 'appstoreconnect-v1' }

header_segment = base64url_encode(header.to_json)
payload_segment = base64url_encode(payload.to_json)
data = [header_segment, payload_segment].join('.')

digest = case alg
         when 'ES256' then OpenSSL::Digest::SHA256.new
         when 'ES384' then OpenSSL::Digest::SHA384.new
         when 'ES512' then OpenSSL::Digest::SHA512.new
         else OpenSSL::Digest::SHA256.new
         end
asn1_signature = key.dsa_sign_asn1(digest.digest(data))
# Parse ASN.1 DER signature (r, s) and convert to raw R||S value per RFC7515
seq = OpenSSL::ASN1.decode(asn1_signature)
r = seq.value[0].value
s = seq.value[1].value

def int_to_nbyte_be(i, n)
  hex = i.to_s(16)
  hex = '0' + hex if hex.length.odd?
  bin = [hex].pack('H*')
  if bin.bytesize < n
    bin = ("\x00" * (n - bin.bytesize)) + bin
  elsif bin.bytesize > n
    # If greater than n bytes, trim leading zeroes (shouldn't normally happen)
    bin = bin[-n, n]
  end
  bin
end

r_bin = int_to_nbyte_be(r, key_size || 32)
s_bin = int_to_nbyte_be(s, key_size || 32)
signature = r_bin + s_bin
token = [data, base64url_encode(signature)].join('.')

puts "JWT iat=#{iat} exp=#{exp}"
puts "JWT header: #{header.to_json}"
puts "JWT payload: #{payload.to_json}"
puts "ASC_KEY_ID (kid): #{kid}" if kid
puts "ASC_ISSUER_ID (iss): #{iss}" if iss
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
