const prisma = require("../config/db");

const MAX_ADDRESSES = 10;

function addressInput(body) {
  const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const data = {
    line1: text(body.line1, 200),
    line2: text(body.line2, 200) || null,
    city: text(body.city, 100),
    state: text(body.state, 100),
    postalCode: text(body.postalCode, 20) || null,
    country: text(body.country, 100) || "Rwanda",
  };
  if (!data.line1 || !data.city || !data.state) {
    throw Object.assign(new Error("Address, city/district and province are required"), { status: 400 });
  }
  return data;
}

// All queries are scoped to req.user.id — a customer only ever sees or
// changes their own addresses.
async function ownAddress(req) {
  const address = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!address) throw Object.assign(new Error("Address not found"), { status: 404 });
  return address;
}

function listForUser(userId) {
  return prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { line1: "asc" }] });
}

async function listAddresses(req, res, next) {
  try {
    res.json(await listForUser(req.user.id));
  } catch (err) {
    next(err);
  }
}

async function createAddress(req, res, next) {
  try {
    const data = addressInput(req.body);
    const count = await prisma.address.count({ where: { userId: req.user.id } });
    if (count >= MAX_ADDRESSES) return res.status(400).json({ error: `You can save up to ${MAX_ADDRESSES} addresses` });

    // The first address saved becomes the default automatically.
    const makeDefault = count === 0 || Boolean(req.body.isDefault);
    await prisma.$transaction(async (tx) => {
      if (makeDefault) await tx.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
      await tx.address.create({ data: { ...data, userId: req.user.id, isDefault: makeDefault } });
    });
    res.status(201).json(await listForUser(req.user.id));
  } catch (err) {
    next(err);
  }
}

async function updateAddress(req, res, next) {
  try {
    await ownAddress(req);
    const data = addressInput(req.body);
    await prisma.address.update({ where: { id: req.params.id }, data });
    res.json(await listForUser(req.user.id));
  } catch (err) {
    next(err);
  }
}

async function setDefaultAddress(req, res, next) {
  try {
    await ownAddress(req);
    await prisma.$transaction([
      prisma.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } }),
      prisma.address.update({ where: { id: req.params.id }, data: { isDefault: true } }),
    ]);
    res.json(await listForUser(req.user.id));
  } catch (err) {
    next(err);
  }
}

// Orders keep their own copy of the address, so deleting a saved one never
// changes past orders.
async function deleteAddress(req, res, next) {
  try {
    const address = await ownAddress(req);
    await prisma.address.delete({ where: { id: address.id } });
    if (address.isDefault) {
      const replacement = await prisma.address.findFirst({ where: { userId: req.user.id } });
      if (replacement) await prisma.address.update({ where: { id: replacement.id }, data: { isDefault: true } });
    }
    res.json(await listForUser(req.user.id));
  } catch (err) {
    next(err);
  }
}

module.exports = { listAddresses, createAddress, updateAddress, setDefaultAddress, deleteAddress };
