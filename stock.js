const xmlHandler = require("xml2js");
const parseString = require("xml2js").parseString;
const builder = new xmlHandler.Builder();
const util = require("util");
const { parseNumbers } = require("xml2js/lib/processors");

const Ajv = new require("ajv");
const ajv = new Ajv();

// this module has a responsibility of handling stock obj and conversions

const stockObjSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    name: { type: "string" },
    category: { type: "string" },
    subcategory: { type: "string" },
    sizes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sizeType: { type: "string" },
          colorsAvailable: { type: "string" },
          price: { type: "integer" },
          costPrice: { type: "integer" },
          quantity: { type: "integer" },
        },
      },
    },
  },
  required: ["id"],
};

module.exports.stockObjSchema = stockObjSchema;

module.exports.Stock = class Stock {
  constructor(xmlStockTag) {
    const jsObject = this.convertToObject(xmlStockTag);
    const validate = ajv.compile(stockObjSchema);

    if (!validate(jsObject)) {
      console.log(util.inspect(jsObject));
      throw "Invalid XML stock data";
    }

    this.initializeStockObject(jsObject);
  }

  convertToObject(xmlStockTag) {
    let jsObj = {};

    parseString(
      xmlStockTag,
      { explicitArray: false, valueProcessors: [parseNumbers] },
      (error, results) => {
        if (error) {
          // console.log(xmlStockTag);
          // console.log(error);
          return;
        }

        // perform flattening operation on the array
        jsObj = results.stock;
        jsObj.sizes = Array.isArray(results.stock.sizes.size)
          ? results.stock.sizes.size
          : [results.stock.sizes.size];
      }
    );

    return jsObj;
  }

  initializeStockObject(jsObject) {
    this.id = jsObject.id;
    this.name = jsObject.name;
    this.category = jsObject.category;
    this.subcategory = jsObject.subcategory;
    this.sizes = jsObject.sizes;
  }
};

/*
below function takes the entire content of an 
xml file and divides it into array of stock 
tags
*/
module.exports.divideXmlStockList = (xmlList) => {
  let formattedXmlList = xmlList
    .replace('<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>', "")
    .replace("<root>", "")
    .replace("</root>", "")
    .replaceAll("\r\n", "")
    .replaceAll("\n", "")
    .replaceAll(" ", "");
  /*
  TODO:
  - The above code is not clean, to use regex 
    expressions to clean up code
  */

  let stockList = formattedXmlList.split("</stock>");

  stockList = stockList.map((value) => value.concat("</stock>"));
  return stockList.filter((value) => value != "</stock>");
};

module.exports.convertToXML = (stockObj) => {
  const deflattened = {};
  deflattened.stock = stockObj;
  deflattened.stock.sizes = {
    size: stockObj.sizes,
  };

  return builder
    .buildObject(deflattened)
    .replace('<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>', "")
    .replace('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', "");
};
