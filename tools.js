// ===== Security Tools (interactive) =====
(function () {
  'use strict';

  // Tab switching
  const tabs = document.querySelectorAll('.tool-nav-item');
  const panels = document.querySelectorAll('.tool-view');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.getElementById('view-' + tab.dataset.tool);
      if (panel) panel.classList.add('active');
    });
  });

  function setOutput(id, text) { document.getElementById(id).textContent = text; }
  function setLoading(id, msg) { setOutput(id, '⏳ ' + msg + '…'); }
  function fmtJSON(obj) { return JSON.stringify(obj, null, 2); }
  function cleanDomain(v) { return v.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''); }

  // ===== Whois (RDAP) =====
  document.getElementById('whoisBtn').addEventListener('click', async () => {
    const domain = cleanDomain(document.getElementById('whoisInput').value);
    if (!domain) { setOutput('whoisOutput', '⚠️ Enter a domain first.'); return; }
    setLoading('whoisOutput', 'Querying RDAP for ' + domain);
    try {
      const res = await fetch('https://rdap.org/domain/' + encodeURIComponent(domain));
      if (!res.ok) throw new Error('RDAP returned ' + res.status);
      const d = await res.json();
      const lines = [];
      lines.push('Domain:      ' + (d.ldhName || domain));
      lines.push('Handle:      ' + (d.handle || '—'));
      lines.push('Status:      ' + (d.status ? d.status.join(', ') : '—'));
      if (d.events) {
        d.events.forEach(e => {
          lines.push(e.eventAction + ': ' + (e.eventDate ? e.eventDate.slice(0, 10) : '—'));
        });
      }
      if (d.nameservers && d.nameservers.length) {
        lines.push('Nameservers:');
        d.nameservers.forEach(ns => lines.push('  • ' + ns.ldhName));
      }
      if (d.entities) {
        d.entities.forEach(ent => {
          const roles = (ent.roles || []).join(', ');
          let name = '—';
          if (ent.vcardArray && ent.vcardArray[1]) {
            const fn = ent.vcardArray[1].find(p => p[0] === 'fn');
            if (fn) name = fn[3];
          }
          lines.push('Entity [' + roles + ']: ' + name);
        });
      }
      setOutput('whoisOutput', lines.join('\n'));
    } catch (err) {
      setOutput('whoisOutput', '❌ ' + err.message + '\n\nTip: RDAP may not cover all TLDs. Try a .com/.net/.org domain.');
    }
  });

  // ===== DNS (Google DoH) =====
  document.getElementById('dnsBtn').addEventListener('click', async () => {
    const domain = cleanDomain(document.getElementById('dnsInput').value);
    const type = document.getElementById('dnsType').value;
    if (!domain) { setOutput('dnsOutput', '⚠️ Enter a domain first.'); return; }
    setLoading('dnsOutput', 'Resolving ' + domain + ' (' + type + ')');
    try {
      const res = await fetch('https://dns.google/resolve?name=' + encodeURIComponent(domain) + '&type=' + type);
      const d = await res.json();
      if (d.Status !== 0) throw new Error('DNS status ' + d.Status + ' (NXDOMAIN or error)');
      const lines = [];
      lines.push('Question: ' + (d.Question && d.Question[0] ? d.Question[0].name + ' ' + type : domain));
      lines.push('');
      if (d.Answer && d.Answer.length) {
        d.Answer.forEach(a => lines.push(a.type + '  ' + a.TTL + '  ' + a.data));
      } else {
        lines.push('(no records of type ' + type + ')');
      }
      setOutput('dnsOutput', lines.join('\n'));
    } catch (err) {
      setOutput('dnsOutput', '❌ ' + err.message);
    }
  });

  // ===== IP Geo (ipwho.is) =====
  document.getElementById('ipgeoBtn').addEventListener('click', async () => {
    const ip = document.getElementById('ipgeoInput').value.trim();
    setLoading('ipgeoOutput', 'Locating ' + (ip || 'your IP'));
    try {
      const res = await fetch('https://ipwho.is/' + (ip ? encodeURIComponent(ip) : ''));
      const d = await res.json();
      if (!d.success) throw new Error(d.message || 'Lookup failed');
      const lines = [];
      lines.push('IP:         ' + d.ip);
      lines.push('Type:       ' + d.type);
      lines.push('Continent:  ' + d.continent);
      lines.push('Country:    ' + d.country + (d.flag ? ' ' + d.flag.emoji : ''));
      lines.push('Region:     ' + d.region);
      lines.push('City:       ' + d.city);
      lines.push('Postal:     ' + (d.postal || '—'));
      lines.push('Lat/Long:   ' + d.latitude + ', ' + d.longitude);
      if (d.connection) {
        lines.push('ASN:        ' + d.connection.asn);
        lines.push('ISP:        ' + d.connection.isp);
        lines.push('Org:        ' + (d.connection.org || '—'));
        lines.push('Domain:     ' + (d.connection.domain || '—'));
      }
      if (d.timezone) lines.push('Timezone:   ' + d.timezone.id);
      setOutput('ipgeoOutput', lines.join('\n'));
    } catch (err) {
      setOutput('ipgeoOutput', '❌ ' + err.message);
    }
  });

  // ===== SSL Certs (CertSpotter) =====
  document.getElementById('sslBtn').addEventListener('click', async () => {
    const domain = cleanDomain(document.getElementById('sslInput').value);
    if (!domain) { setOutput('sslOutput', '⚠️ Enter a domain first.'); return; }
    setLoading('sslOutput', 'Searching CertSpotter for ' + domain);
    try {
      const target = 'https://api.certspotter.com/v1/issuances?domain=' + encodeURIComponent(domain) + '&include_subdomains=true&expand=dns_names';
      const res = await fetch(target);
      if (!res.ok) throw new Error('CertSpotter returned ' + res.status);
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) throw new Error('No certificates found');
      const names = new Set();
      data.forEach(c => {
        if (c.dns_names) c.dns_names.forEach(n => n && names.add(n.trim()));
      });
      const lines = [];
      lines.push('Found ' + names.size + ' unique names in ' + data.length + ' certificates:');
      lines.push('');
      Array.from(names).sort().forEach(n => lines.push('  • ' + n));
      setOutput('sslOutput', lines.join('\n'));
    } catch (err) {
      setOutput('sslOutput', '❌ ' + err.message);
    }
  });

  // ===== Hash =====
  document.getElementById('hashBtn').addEventListener('click', async () => {
    const text = document.getElementById('hashInput').value;
    const algo = document.getElementById('hashAlgo').value;
    if (!text) { setOutput('hashOutput', '⚠️ Enter text to hash.'); return; }
    setLoading('hashOutput', 'Hashing with ' + algo);
    try {
      let hex;
      if (algo === 'MD5') {
        hex = md5(text);
      } else {
        const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(text));
        hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
      setOutput('hashOutput', algo + ':\n' + hex);
    } catch (err) {
      setOutput('hashOutput', '❌ ' + err.message);
    }
  });

  // ===== Encode / Decode =====
  document.getElementById('encodeBtn').addEventListener('click', () => {
    const text = document.getElementById('encodeInput').value;
    const mode = document.getElementById('encodeMode').value;
    if (!text) { setOutput('encodeOutput', '⚠️ Enter text to convert.'); return; }
    try {
      let out;
      switch (mode) {
        case 'b64e': out = btoa(unescape(encodeURIComponent(text))); break;
        case 'b64d': out = decodeURIComponent(escape(atob(text.trim()))); break;
        case 'urle': out = encodeURIComponent(text); break;
        case 'urld': out = decodeURIComponent(text); break;
        case 'hexe': out = Array.from(new TextEncoder().encode(text)).map(b => b.toString(16).padStart(2, '0')).join(''); break;
        case 'hexd': {
          const clean = text.replace(/\s+/g, '');
          const bytes = new Uint8Array(clean.match(/.{1,2}/g).map(h => parseInt(h, 16)));
          out = new TextDecoder().decode(bytes);
          break;
        }
      }
      setOutput('encodeOutput', out);
    } catch (err) {
      setOutput('encodeOutput', '❌ ' + err.message);
    }
  });

  // ===== JWT Decoder =====
  document.getElementById('jwtBtn').addEventListener('click', () => {
    const token = document.getElementById('jwtInput').value.trim();
    if (!token) { setOutput('jwtOutput', '⚠️ Paste a JWT first.'); return; }
    try {
      const parts = token.split('.');
      if (parts.length < 2) throw new Error('Not a valid JWT (expected 3 dot-separated parts)');
      const b64urlDecode = (s) => {
        s = s.replace(/-/g, '+').replace(/_/g, '/');
        while (s.length % 4) s += '=';
        return decodeURIComponent(escape(atob(s)));
      };
      const header = JSON.parse(b64urlDecode(parts[0]));
      const payload = JSON.parse(b64urlDecode(parts[1]));
      const lines = [];
      lines.push('HEADER:');
      lines.push(fmtJSON(header));
      lines.push('');
      lines.push('PAYLOAD:');
      lines.push(fmtJSON(payload));
      lines.push('');
      lines.push('SIGNATURE: ' + (parts[2] ? parts[2].slice(0, 20) + '…' : '(none)'));
      lines.push('⚠️ Signature is NOT verified — this only decodes.');
      setOutput('jwtOutput', lines.join('\n'));
    } catch (err) {
      setOutput('jwtOutput', '❌ ' + err.message);
    }
  });

  // ===== Data Leak Search (LeakCheck via cors.sh) =====
  document.getElementById('leakBtn').addEventListener('click', async () => {
    const query = document.getElementById('leakInput').value.trim();
    if (!query) { setOutput('leakOutput', '⚠️ Enter an email, domain, username, or phone number.'); return; }
    setLoading('leakOutput', 'Searching breach databases for ' + query);
    try {
      const target = 'https://leakcheck.io/api/public?check=' + encodeURIComponent(query);
      const res = await fetch('https://cors.sh/' + target);
      if (!res.ok) throw new Error('LeakCheck returned ' + res.status);
      const d = await res.json();
      if (!d.success) throw new Error(d.error || 'No results');
      const lines = [];
      lines.push('🔍 Query: ' + query);
      lines.push('📊 Records found: ' + (d.found || 0));
      lines.push('');
      if (d.sources && d.sources.length) {
        lines.push('Breach sources (' + d.sources.length + '):');
        d.sources.forEach(s => lines.push('  • ' + s.name + (s.date ? ' (' + s.date + ')' : '')));
      }
      if (d.fields && d.fields.length) {
        lines.push('');
        lines.push('Exposed data types:');
        lines.push('  ' + d.fields.join(', '));
      }
      lines.push('');
      lines.push('⚠️ This is public breach data. If your info appears here, change affected passwords and enable 2FA.');
      setOutput('leakOutput', lines.join('\n'));
    } catch (err) {
      setOutput('leakOutput', '❌ ' + err.message);
    }
  });

  // ===== Password Breach (HIBP k-anonymity) =====
  document.getElementById('pwnedBtn').addEventListener('click', async () => {
    const pwd = document.getElementById('pwnedInput').value;
    if (!pwd) { setOutput('pwnedOutput', '⚠️ Enter a password to check.'); return; }
    setLoading('pwnedOutput', 'Checking against HIBP (k-anonymity)');
    try {
      // SHA-1 hash, send only first 5 chars (k-anonymity)
      const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(pwd));
      const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      const prefix = hash.slice(0, 5);
      const suffix = hash.slice(5);
      const res = await fetch('https://api.pwnedpasswords.com/range/' + prefix);
      if (!res.ok) throw new Error('HIBP returned ' + res.status);
      const text = await res.text();
      const match = text.split('\n').find(line => line.split(':')[0] === suffix);
      if (match) {
        const count = parseInt(match.split(':')[1], 10);
        setOutput('pwnedOutput', '🔴 PWNED — this password has been seen ' + count.toLocaleString() + ' times in data breaches.\n\nDo not use it. Choose a unique, strong password (or a password manager).');
      } else {
        setOutput('pwnedOutput', '🟢 Not found — this password has not appeared in any known breach.\n\n(Still use a unique password per site.)');
      }
    } catch (err) {
      setOutput('pwnedOutput', '❌ ' + err.message);
    }
  });

  // ===== Subdomain Enumeration (HackerTarget) =====
  document.getElementById('subdomainBtn').addEventListener('click', async () => {
    const domain = cleanDomain(document.getElementById('subdomainInput').value);
    if (!domain) { setOutput('subdomainOutput', '⚠️ Enter a domain first.'); return; }
    setLoading('subdomainOutput', 'Enumerating subdomains for ' + domain);
    try {
      const res = await fetch('https://api.hackertarget.com/hostsearch/?q=' + encodeURIComponent(domain));
      const text = await res.text();
      if (text.startsWith('error') || text.startsWith('API count exceeded')) throw new Error(text);
      const lines = text.trim().split('\n').filter(Boolean);
      if (!lines.length) throw new Error('No subdomains found');
      const out = [];
      out.push('Found ' + lines.length + ' host(s):');
      out.push('');
      lines.forEach(l => {
        const [host, ip] = l.split(',');
        out.push('  • ' + host + (ip ? '  →  ' + ip : ''));
      });
      setOutput('subdomainOutput', out.join('\n'));
    } catch (err) {
      setOutput('subdomainOutput', '❌ ' + err.message);
    }
  });

  // ===== Reverse IP (HackerTarget) =====
  document.getElementById('reverseipBtn').addEventListener('click', async () => {
    const ip = document.getElementById('reverseipInput').value.trim();
    if (!ip) { setOutput('reverseipOutput', '⚠️ Enter an IP address.'); return; }
    setLoading('reverseipOutput', 'Looking up domains on ' + ip);
    try {
      const res = await fetch('https://api.hackertarget.com/reverseiplookup/?q=' + encodeURIComponent(ip));
      const text = await res.text();
      if (text.startsWith('error') || text.startsWith('API count exceeded')) throw new Error(text);
      const lines = text.trim().split('\n').filter(Boolean);
      if (!lines.length) throw new Error('No domains found on this IP');
      const out = [];
      out.push('Found ' + lines.length + ' domain(s) on ' + ip + ':');
      out.push('');
      lines.forEach(l => out.push('  • ' + l));
      setOutput('reverseipOutput', out.join('\n'));
    } catch (err) {
      setOutput('reverseipOutput', '❌ ' + err.message);
    }
  });

  // ===== HTTP Headers (HackerTarget) =====
  document.getElementById('headersBtn').addEventListener('click', async () => {
    let url = document.getElementById('headersInput').value.trim();
    if (!url) { setOutput('headersOutput', '⚠️ Enter a URL.'); return; }
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    setLoading('headersOutput', 'Fetching headers for ' + url);
    try {
      const res = await fetch('https://api.hackertarget.com/httpheaders/?q=' + encodeURIComponent(url));
      const text = await res.text();
      if (text.startsWith('error') || text.startsWith('API count exceeded')) throw new Error(text);
      setOutput('headersOutput', text);
    } catch (err) {
      setOutput('headersOutput', '❌ ' + err.message);
    }
  });

  // ===== Wayback History (CDX via cors.sh) =====
  document.getElementById('waybackBtn').addEventListener('click', async () => {
    const url = cleanDomain(document.getElementById('waybackInput').value);
    if (!url) { setOutput('waybackOutput', '⚠️ Enter a URL or domain.'); return; }
    setLoading('waybackOutput', 'Searching archive for ' + url);
    try {
      const target = 'https://web.archive.org/cdx/search/cdx?url=' + encodeURIComponent(url) + '&output=json&limit=50&fl=timestamp,original,statuscode,mimetype';
      const res = await fetch('https://cors.sh/' + target);
      if (!res.ok) throw new Error('Archive returned ' + res.status);
      const data = await res.json();
      if (!Array.isArray(data) || data.length < 2) throw new Error('No snapshots found');
      const rows = data.slice(1); // skip header
      const out = [];
      out.push('Found ' + rows.length + ' snapshot(s):');
      out.push('');
      rows.forEach(r => {
        const [ts, orig, status, mime] = r;
        const date = ts ? ts.slice(0, 4) + '-' + ts.slice(4, 6) + '-' + ts.slice(6, 8) : '?';
        out.push('  ' + date + '  [' + (status || '?') + ']  ' + (mime || '?') + '  ' + (orig || ''));
      });
      setOutput('waybackOutput', out.join('\n'));
    } catch (err) {
      setOutput('waybackOutput', '❌ ' + err.message);
    }
  });

  // ===== CVE Lookup (CIRCL) =====
  document.getElementById('cveBtn').addEventListener('click', async () => {
    let cve = document.getElementById('cveInput').value.trim().toUpperCase();
    if (!cve) { setOutput('cveOutput', '⚠️ Enter a CVE ID.'); return; }
    if (!/^CVE-\d{4}-\d+$/.test(cve)) { setOutput('cveOutput', '⚠️ Invalid format. Use CVE-YYYY-NNNN.'); return; }
    setLoading('cveOutput', 'Looking up ' + cve);
    try {
      const res = await fetch('https://cve.circl.lu/api/cve/' + encodeURIComponent(cve));
      if (!res.ok) throw new Error('CIRCL returned ' + res.status + ' (CVE not found?)');
      const d = await res.json();
      const meta = d.cveMetadata || {};
      const cna = (d.containers && d.containers.cna) || {};
      const out = [];
      out.push('CVE:        ' + (meta.cveId || cve));
      out.push('State:      ' + (meta.state || '—'));
      out.push('Published:  ' + (meta.datePublished ? meta.datePublished.slice(0, 10) : '—'));
      out.push('Updated:    ' + (meta.dateUpdated ? meta.dateUpdated.slice(0, 10) : '—'));
      out.push('');
      // Description
      if (cna.descriptions && cna.descriptions[0]) {
        out.push('DESCRIPTION:');
        out.push(cna.descriptions[0].value);
        out.push('');
      }
      // CVSS
      const adp = (d.containers && d.containers.adp) || [];
      adp.forEach(a => {
        (a.metrics || []).forEach(m => {
          if (m.cvssV3_1) {
            out.push('CVSS v3.1:  ' + m.cvssV3_1.baseScore + ' (' + m.cvssV3_1.baseSeverity + ')');
            out.push('Vector:     ' + m.cvssV3_1.vectorString);
            out.push('');
          }
        });
      });
      // Affected products
      if (cna.affected && cna.affected.length) {
        out.push('AFFECTED:');
        cna.affected.slice(0, 10).forEach(a => {
          out.push('  • ' + (a.vendor || '?') + ' ' + (a.product || '?'));
        });
        out.push('');
      }
      // References
      if (cna.references && cna.references.length) {
        out.push('REFERENCES (' + cna.references.length + '):');
        cna.references.slice(0, 8).forEach(r => out.push('  • ' + r.url));
      }
      setOutput('cveOutput', out.join('\n'));
    } catch (err) {
      setOutput('cveOutput', '❌ ' + err.message);
    }
  });

  // ===== MD5 (compact, standard implementation) =====
  function md5(str) {
    function rotateLeft(lValue, iShiftBits) { return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits)); }
    function addUnsigned(lX, lY) {
      var lX8 = (lX & 0x80000000), lY8 = (lY & 0x80000000);
      var lX4 = (lX & 0x40000000), lY4 = (lY & 0x40000000);
      var lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
      if (lX4 & lY4) return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
      if (lX4 | lY4) {
        if (lResult & 0x40000000) return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
        else return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
      } else return (lResult ^ lX8 ^ lY8);
    }
    function F(x, y, z) { return (x & y) | ((~x) & z); }
    function G(x, y, z) { return (x & z) | (y & (~z)); }
    function H(x, y, z) { return (x ^ y ^ z); }
    function I(x, y, z) { return (y ^ (x | (~z))); }
    function FF(a, b, c, d, x, s, ac) { a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac)); return addUnsigned(rotateLeft(a, s), b); }
    function GG(a, b, c, d, x, s, ac) { a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac)); return addUnsigned(rotateLeft(a, s), b); }
    function HH(a, b, c, d, x, s, ac) { a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac)); return addUnsigned(rotateLeft(a, s), b); }
    function II(a, b, c, d, x, s, ac) { a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac)); return addUnsigned(rotateLeft(a, s), b); }
    function convertToWordArray(str) {
      var lWordCount, lMessageLength = str.length;
      var lNumberOfWords_temp1 = lMessageLength + 8;
      var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
      var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
      var lWordArray = new Array(lNumberOfWords - 1);
      var lBytePosition = 0, lByteCount = 0;
      while (lByteCount < lMessageLength) {
        lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = (lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition));
        lByteCount++;
      }
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
      lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
      lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
      return lWordArray;
    }
    function wordToHex(lValue) {
      var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
      for (lCount = 0; lCount <= 3; lCount++) {
        lByte = (lValue >>> (lCount * 8)) & 255;
        WordToHexValue_temp = "0" + lByte.toString(16);
        WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
      }
      return WordToHexValue;
    }
    var x = [], k, AA, BB, CC, DD, a, b, c, d;
    var S11 = 7, S12 = 12, S13 = 17, S14 = 22, S21 = 5, S22 = 9, S23 = 14, S24 = 20;
    var S31 = 4, S32 = 11, S33 = 16, S34 = 23, S41 = 6, S42 = 10, S43 = 15, S44 = 21;
    str = unescape(encodeURIComponent(str));
    x = convertToWordArray(str);
    a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;
    for (k = 0; k < x.length; k += 16) {
      AA = a; BB = b; CC = c; DD = d;
      a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
      d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
      c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
      b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
      a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
      d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
      c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
      b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
      a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
      d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
      c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
      b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
      a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
      d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
      c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
      b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
      a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
      d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
      c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
      b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
      a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
      d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
      c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
      b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
      a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
      d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
      c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
      b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
      a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
      d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
      c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
      b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
      a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
      d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
      c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
      b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
      a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
      d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
      c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
      b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
      a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
      d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
      c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
      b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
      a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
      d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
      c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
      b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
      a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
      d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
      c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
      b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
      a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
      d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
      c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
      b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
      a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
      d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
      c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
      b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
      a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
      d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
      c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
      b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
      a = addUnsigned(a, AA); b = addUnsigned(b, BB); c = addUnsigned(c, CC); d = addUnsigned(d, DD);
    }
    return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
  }
})();
