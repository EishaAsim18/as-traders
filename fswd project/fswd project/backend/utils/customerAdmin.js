const Order = require("../models/Order");

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
    orderCount: orderCount || 0,
    createdAt: customer.createdAt,
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
};
