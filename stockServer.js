const express = require("express");
const app = express();
const port = 3000;
const cors = require("cors");
const { getData, writeData, appendTodayRecord } = require("./csvManager");

const {
  Stock,
  divideXmlStockList,
  convertToXML,
  stockObjSchema,
} = require("./stock.js");
const fs = require("node:fs");

const Ajv = new require("ajv");
const ajv = new Ajv();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/*
Future TODO:
- use advance express features like routes and stuff
  to make code more clean and modular.
*/

app.get("/accounts/:date/:month/:year", (req, res) => {
  const { date, month, year } = req.params;

  const dataPromise = getData(date, month, year);
  dataPromise.then((dataMap) => res.json(dataMap));
});

app.post("/accounts/:date/:month/:year", (req, res) => {
  const { date, month, year } = req.params;
  const dataArray = req.body;
  writeData(dataArray, date, month, year);
});

app.post("/accounts/appendRecord/today", (req, res) => {
  const record = req.body;
  appendTodayRecord(record);
});

app.delete("/:category", (req, res) => {
  const { category, fileName } = req.params;
  const response = deleteFile(category);
  res.sendStatus(response);
});

app.put("/:category/:newName", (req, res) => {
  const { category, newName } = req.params;

  try {
    fs.renameSync(
      "./Inventory/".concat(category, ".xml"),
      "./Inventory/".concat(newName, ".xml")
    );
  } catch (err) {
    console.log(err);
  }
});

app.post("/:category", (req, res) => {
  const validate = ajv.compile(stockObjSchema);
  const stockObjects = req.body;
  const { category } = req.params;

  if (!stockObjects.every((object) => validate(object)))
    res
      .status(400)
      .send("Invalid data format, maybe the stock data has been corrupted");

  let xmlData =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>\n<root>';

  stockObjects.forEach((stock) => {
    const stockTag = convertToXML(stock);
    xmlData = xmlData.concat(stockTag);
  });

  xmlData = xmlData.concat("\n</root>");
  writeToFile(xmlData, category);
  res.sendStatus(200);
});

app.get("/:category", (req, res) => {
  const { category } = req.params;
  const xmlData = readFromFile(category);

  const stockObjects = divideXmlStockList(xmlData).map(
    (stockXml) => new Stock(stockXml)
  );

  res.json(stockObjects);
});

app.get("/", (req, res) => {
  const categoryNames = fs.readdirSync("./Inventory");

  const stockObjects = {};

  categoryNames.forEach((fileName) => {
    const category = fileName.replace(".xml", "");
    const xmlData = readFromFile(category);

    const fileStockObjects = divideXmlStockList(xmlData).map(
      (stockXml) => new Stock(stockXml)
    );

    stockObjects[category] = fileStockObjects;
  });

  res.json(stockObjects);
});

function deleteFile(category) {
  try {
    fs.rmSync("./Inventory/" + category + ".xml", {
      recursive: true,
    });
    return 200;
  } catch (err) {
    console.log(err);
    return 400;
  }
}

function readFromFile(category) {
  try {
    return fs.readFileSync("./Inventory/" + category + ".xml", {
      encoding: "utf8",
    });
  } catch (err) {
    console.log(err);
  }
}

// overwrite existing or create new file
function writeToFile(xmlData, category) {
  fs.writeFile("./Inventory/" + category + ".xml", xmlData, (err) => {
    if (err) {
      console.log(err);
    }
  });
}

app.listen(port, () => {
  console.log("listening on port: ".concat(port));
});
