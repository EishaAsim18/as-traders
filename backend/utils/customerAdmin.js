const Order = require("../models/Order");
const Customer = require("../models/Customer");

function formatAddress(customer) {
  const parts = [];
  if (customer.streetAddress) parts.push(customer.streetAddress);
  if (customer.city) parts.push(customer.city);
  return parts.join(", ") || "";
}

function orderMatchFilter(customer) {
  const or = [{ customerId: customer._id }];
  if (customer.email) {
    const email = customer.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    or.push({ customerEmail: new RegExp("^" + email + "$", "i") });
  }
  if (customer.phone) {
    or.push({ customerPhone: customer.phone });
  }
  return { $or: or };
}

async function fetchOrdersForCustomer(customer, limit) {
  const max = limit || 50;
  return Order.find(orderMatchFilter(customer))
    .sort({ createdAt: -1 })
    .limit(max)
    .lean();
}

async function countOrdersForCustomer(customer) {
  return Order.countDocuments(orderMatchFilter(customer));
}

function formatCustomerListItem(customer, orderCount) {
  const address = formatAddress(customer);
  return {
    id: customer._id,
    name: customer.firstName + " " + customer.lastName,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone || "",
    city: customer.city || "",
    streetAddress: customer.streetAddress || "",
    address: address || "—",
    isBlocked: !!customer.isBlocked,
    isGuest: false,
    orderCount: orderCount || 0,
    createdAt: customer.createdAt,
  };
}

function guestIdFromKey(guestKey) {
  return "guest:" + guestKey;
}

function parseGuestId(id) {
  if (!id || !String(id).startsWith("guest:")) return null;
  const rest = String(id).slice("guest:".length);
  const sep = rest.indexOf(":");
  if (sep <= 0) return null;
  return {
    type: rest.slice(0, sep),
    key: rest.slice(sep + 1),
  };
}

function guestOrderMatchFilter(parsed) {
  const base = {
    $or: [{ customerId: null }, { customerId: { $exists: false } }],
  };
  if (parsed.type === "email") {
    const email = parsed.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    base.customerEmail = new RegExp("^" + email + "$", "i");
  } else if (parsed.type === "phone") {
    base.customerPhone = parsed.key;
  } else {
    return null;
  }
  return base;
}

async function fetchRegisteredIdentitySets() {
  const registered = await Customer.find({}).select("email phone isBlocked").lean();
  const emails = new Set();
  const phones = new Set();
  const blockedEmails = new Set();

  registered.forEach(function (customer) {
    const email = (customer.email || "").trim().toLowerCase();
    const phone = (customer.phone || "").trim();
    if (email) {
      emails.add(email);
      if (customer.isBlocked) blockedEmails.add(email);
    }
    if (phone) phones.add(phone);
  });

  return { emails, phones, blockedEmails };
}

function guestSummaryMatchesSearch(summary, q) {
  if (!q) return true;
  const term = String(q).trim().toLowerCase();
  if (!term) return true;
  return [summary.name, summary.email, summary.phone, summary.address]
    .join(" ")
    .toLowerCase()
    .includes(term);
}

function formatGuestListItem(group, blockedEmails) {
  const email = (group.email || "").trim();
  const emailNorm = email.toLowerCase();
  const phone = (group.phone || "").trim();
  const guestKey =
    emailNorm ? "email:" + emailNorm : phone ? "phone:" + phone : "unknown:" + group._id;
  const addressParts = [];
  if (group.streetAddress) addressParts.push(group.streetAddress);
  if (group.city) addressParts.push(group.city);

  return {
    id: guestIdFromKey(guestKey),
    name: group.name || "Guest customer",
    firstName: group.name || "Guest",
    lastName: "",
    email: email || "—",
    phone: phone || "",
    city: group.city || "",
    streetAddress: group.streetAddress || "",
    address: addressParts.join(", ") || "—",
    isBlocked: !!(emailNorm && blockedEmails.has(emailNorm)),
    isGuest: true,
    orderCount: group.orderCount || 0,
    createdAt: group.firstOrderAt || group.lastOrderAt,
  };
}

async function fetchGuestCustomerSummaries(options) {
  const opts = options || {};
  const limit = Math.min(Number(opts.limit) || 100, 200);
  const { emails, phones, blockedEmails } = await fetchRegisteredIdentitySets();

  const pipeline = [
    {
      $match: {
        $or: [{ customerId: null }, { customerId: { $exists: false } }],
      },
    },
    {
      $addFields: {
        emailNorm: {
          $toLower: {
            $trim: { input: { $ifNull: ["$customerEmail", ""] } },
          },
        },
        phoneNorm: { $trim: { input: { $ifNull: ["$customerPhone", ""] } } },
      },
    },
    {
      $addFields: {
        guestKey: {
          $cond: [
            { $gt: [{ $strLenCP: "$emailNorm" }, 0] },
            { $concat: ["email:", "$emailNorm"] },
            {
              $cond: [
                { $gt: [{ $strLenCP: "$phoneNorm" }, 0] },
                { $concat: ["phone:", "$phoneNorm"] },
                { $concat: ["order:", { $toString: "$_id" }] },
              ],
            },
          ],
        },
      },
    },
    {
      $group: {
        _id: "$guestKey",
        name: { $first: "$customerName" },
        email: { $first: "$customerEmail" },
        phone: { $first: "$customerPhone" },
        city: { $first: "$city" },
        streetAddress: { $first: "$streetAddress" },
        orderCount: { $sum: 1 },
        firstOrderAt: { $min: "$createdAt" },
        lastOrderAt: { $max: "$createdAt" },
      },
    },
    { $sort: { lastOrderAt: -1 } },
    { $limit: limit * 3 },
  ];

  const groups = await Order.aggregate(pipeline);
  const guests = [];

  groups.forEach(function (group) {
    const key = group._id || "";
    if (key.startsWith("email:")) {
      const email = key.slice("email:".length);
      if (emails.has(email)) return;
    } else if (key.startsWith("phone:")) {
      const phone = key.slice("phone:".length);
      if (phones.has(phone)) return;
    } else {
      return;
    }

    const summary = formatGuestListItem(group, blockedEmails);
    if (!guestSummaryMatchesSearch(summary, opts.q)) return;

    if (opts.blocked === "true" && !summary.isBlocked) return;
    if (opts.blocked === "false" && summary.isBlocked) return;

    guests.push(summary);
  });

  return guests.slice(0, limit);
}

async function fetchGuestCustomerDetail(guestId) {
  const parsed = parseGuestId(guestId);
  if (!parsed) return null;

  const filter = guestOrderMatchFilter(parsed);
  if (!filter) return null;

  const orders = await Order.find(filter).sort({ createdAt: -1 }).lean();
  if (!orders.length) return null;

  const latest = orders[0];
  const email = (latest.customerEmail || "").trim();
  const emailNorm = email.toLowerCase();
  const phone = (latest.customerPhone || "").trim();
  const guestKey = emailNorm ? "email:" + emailNorm : "phone:" + phone;
  const addressParts = [];
  if (latest.streetAddress) addressParts.push(latest.streetAddress);
  if (latest.city) addressParts.push(latest.city);

  let isBlocked = false;
  if (emailNorm) {
    const blocked = await Customer.findOne({ email: emailNorm, isBlocked: true }).select("_id");
    isBlocked = !!blocked;
  }

  return {
    id: guestIdFromKey(guestKey),
    name: latest.customerName || "Guest customer",
    firstName: latest.customerName || "Guest",
    lastName: "",
    email: email || "—",
    phone: phone || "",
    city: latest.city || "",
    streetAddress: latest.streetAddress || "",
    address: addressParts.join(", ") || "—",
    isBlocked: isBlocked,
    isGuest: true,
    orderCount: orders.length,
    createdAt: orders[orders.length - 1].createdAt,
    orders: orders.map(formatOrderSummary),
  };
}

function formatOrderSummary(order) {
  return {
    id: order._id,
    orderNumber: order.orderNumber,
    amount: order.amount,
    status: order.status,
    paymentStatus: order.paymentStatus || "unpaid",
    createdAt: order.createdAt,
    itemCount: (order.items || []).length,
  };
}

function formatCustomerDetail(customer, orders, orderCount) {
  const base = formatCustomerListItem(customer, orderCount);
  return {
    ...base,
    blockedAt: customer.blockedAt,
    orders: orders.map(formatOrderSummary),
  };
}

module.exports = {
  formatAddress,
  orderMatchFilter,
  fetchOrdersForCustomer,
  countOrdersForCustomer,
  formatCustomerListItem,
  formatCustomerDetail,
  fetchGuestCustomerSummaries,
  fetchGuestCustomerDetail,
  parseGuestId,
};
