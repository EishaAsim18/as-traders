function digitsOnly(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function phoneLast4(phone) {
  const d = digitsOnly(phone);
  return d.length >= 4 ? d.slice(-4) : d;
}

function phoneLast4Matches(phone, providedLast4) {
  const expected = phoneLast4(phone);
  const given = digitsOnly(providedLast4).slice(-4);
  return expected.length === 4 && given.length === 4 && expected === given;
}

module.exports = { digitsOnly, phoneLast4, phoneLast4Matches };
