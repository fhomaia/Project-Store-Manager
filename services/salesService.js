const { ObjectId } = require('mongodb');
const salesModel = require('../models/salesModel');
const productModel = require('../models/productsModel');

const lowStockRegister = async (sales) => {
  const productsRegistered = await productModel.getProducts();
    const validateSales = sales.find(({ productId, quantity }) => {
      const checkData = productsRegistered.products
      .find(({ _id }) => _id.toString() === productId);
      const lowStock = checkData.quantity < quantity;
      return lowStock;
    });
    if (validateSales) {
    return {
      err: { 
        code: 'stock_problem',
        message: 'Such amount is not permitted to sell',
      },
    };
  }
  return false;
};

const registerNewSale = async (sales) => {
  const productsRegistered = await productModel.getProducts();
  const validateSales = sales.find(({ productId, quantity }) => {
    if (!ObjectId.isValid(productId)) return true;
    const checkData = productsRegistered.products
      .find(({ _id }) => _id.toString() === productId);
    return checkData === undefined || typeof quantity !== 'number' || quantity < 1;
  });
  if (validateSales) {
    return {
      err: { 
        code: 'invalid_data',
        message: 'Wrong product ID or invalid quantity',
      },
    };
  }
  const lowStock = await lowStockRegister(sales);
  if (lowStock) return lowStock;
  return salesModel.registerNewSale(sales);
};

const validateId = (id, error) => {
  if (!ObjectId.isValid(id)) {
    return error;
  }
  return false;
};

const getSalesById = async (id) => {
  const error = {
    err: { 
      code: 'not_found',
      message: 'Sale not found',
    },
  };
  const idNotValid = validateId(id, error);
  if (idNotValid) return idNotValid;
  const getSales = await salesModel.getSalesById(id);
  if (!getSales) {
    return error;
  }
  return getSales;
};

const lowStockUpdate = async (saleId, update) => {
  const changeQuantity = await salesModel.calculateDifference(saleId, update);
  const productsRegistered = await productModel.getProducts();
  const checkStock = changeQuantity.find(({ productId, quantity }) => (
    productsRegistered.products.find(({ productId: id, quantity: registeredQuantity }) => { 
      if (id === productId) return quantity > registeredQuantity;
      return false;
    })
  ));
  if (checkStock) {
    return {
      err: { 
        code: 'stock_problem',
        message: 'Such amount is not permitted to sell',
      },
    };
  }
};

const updateSale = async ({ id, update }) => {
  const error = {
    err: { 
      code: 'invalid_data',
      message: 'Wrong product ID or invalid quantity',
    },
  };
  const idNotValid = validateId(id, error);
  if (idNotValid) return idNotValid;
  const validateQuantity = update
    .find(({ quantity }) => typeof quantity !== 'number' || quantity < 1);
  const stockLower = await lowStockUpdate(id, update);
  if (stockLower) return stockLower;
  if (validateQuantity) {
    return error;
  }
  return salesModel.updateSale({ id, update });
};

const deleteSale = async (id) => {
  const error = {
    err: { 
      code: 'invalid_data',
      message: 'Wrong sale ID format',
    },
  };
  const idNotValid = validateId(id, error);
  if (idNotValid) return idNotValid;
  const sale = await salesModel.deleteSale(id);
  if (sale) return sale;
  return error;
};

module.exports = {
  registerNewSale,
  getSalesById,
  updateSale,
  deleteSale,
};