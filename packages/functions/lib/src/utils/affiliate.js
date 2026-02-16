"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AFFILIATE_PROGRAMS = void 0;
exports.convertAffiliateUrl = convertAffiliateUrl;
exports.AFFILIATE_PROGRAMS = [
    {
        name: "Amazon Associates",
        domains: ["amazon.com", "amzn.to"],
        param: "tag",
        defaultCommission: 4,
        envTagKey: "AMAZON_AFFILIATE_TAG",
    },
    {
        name: "eBay Partner Network",
        domains: ["ebay.com", "ebay.to"],
        param: "campid",
        defaultCommission: 3,
        envTagKey: "EBAY_AFFILIATE_CAMPAIGN_ID",
    },
    {
        name: "Walmart Affiliate",
        domains: ["walmart.com"],
        param: "affp1",
        defaultCommission: 2,
        envTagKey: "WALMART_AFFILIATE_ID",
    },
    {
        name: "Target Partners",
        domains: ["target.com"],
        param: "afid",
        defaultCommission: 2,
        envTagKey: "TARGET_AFFILIATE_ID",
    },
    {
        name: "Best Buy Affiliate",
        domains: ["bestbuy.com"],
        param: "acampID",
        defaultCommission: 2,
        envTagKey: "BESTBUY_AFFILIATE_ID",
    },
    {
        name: "Etsy Affiliate",
        domains: ["etsy.com"],
        param: "ref",
        defaultCommission: 4,
        envTagKey: "ETSY_AFFILIATE_TAG",
    },
];
function convertAffiliateUrl(inputUrl) {
    if (!inputUrl) {
        return {
            convertedUrl: inputUrl,
            program: null,
            originalUrl: inputUrl,
            wasConverted: false,
        };
    }
    let url;
    try {
        url = new URL(inputUrl);
    }
    catch (_a) {
        return {
            convertedUrl: inputUrl,
            program: null,
            originalUrl: inputUrl,
            wasConverted: false,
        };
    }
    const hostname = url.hostname.replace(/^www\./, "");
    const program = exports.AFFILIATE_PROGRAMS.find((candidate) => candidate.domains.some((domain) => hostname.endsWith(domain)));
    if (!program) {
        return {
            convertedUrl: inputUrl,
            program: null,
            originalUrl: inputUrl,
            wasConverted: false,
        };
    }
    const tagValue = process.env[program.envTagKey] || "";
    if (!tagValue) {
        return {
            convertedUrl: inputUrl,
            program,
            originalUrl: inputUrl,
            wasConverted: false,
        };
    }
    url.searchParams.set(program.param, tagValue);
    return {
        convertedUrl: url.toString(),
        program,
        originalUrl: inputUrl,
        wasConverted: true,
        tagUsed: tagValue,
    };
}
//# sourceMappingURL=affiliate.js.map