const express = require("express");
const app = express();
const port = 3000;
const cors = require("cors");

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

/*
Future TODO:
- use advance express features like routes and stuff
  to make code more clean and modular.
*/

app.delete("/:category", (req, res) => {
  const { category, fileName } = req.params;
  const response = deleteFile(category);
  res.sendStatus(response);
});

app.delete("/:category/:fileName", (req, res) => {
  const { category, fileName } = req.params;
  const response = deleteFile(category, fileName + ".xml");
  res.sendStatus(response);
});

app.put("/:category/:newName", (req, res) => {
  const { category, newName } = req.params;

  try {
    fs.renameSync(
      "./Inventory/".concat(category),
      "./Inventory/".concat(newName)
    );
  } catch (err) {
    console.log(err);
  }
});

app.put("/:category/:subcategory/:newName", (req, res) => {
  const { category, subcategory, newName } = req.params;

  try {
    fs.renameSync(
      "./Inventory/".concat(category, "/", subcategory, ".xml"),
      "./Inventory/".concat(category, "/", newName, ".xml")
    );
  } catch (err) {
    console.log(err);
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.post("/:category/:fileName", (req, res) => {
  const validate = ajv.compile(stockObjSchema);
  const stockObjects = req.body;
  const { category, fileName } = req.params;

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

  // console.log("this is data \n" + xmlData);

  xmlData = xmlData.concat("\n</root>");
  writeToFile(xmlData, category, fileName + ".xml");
  res.sendStatus(200);
});

app.get("/:category/:fileName", (req, res) => {
  const { category, fileName } = req.params;
  const xmlData = readFromFile(category, fileName + ".xml");
  console.log(divideXmlStockList(xmlData));

  const stockObjects = divideXmlStockList(xmlData).map(
    (stockXml) => new Stock(stockXml)
  );

  res.json(stockObjects);
});

app.get("/", (req, res) => {
  const categoryNames = fs.readdirSync("./Inventory");

  const stockObjects = {};

  categoryNames.forEach((category) => {
    const fileNames = fs.readdirSync("./Inventory/" + category);
    stockObjects[category] = {};

    fileNames.forEach((file) => {
      const xmlData = readFromFile(category, file);

      const fileStockObjects = divideXmlStockList(xmlData).map(
        (stockXml) => new Stock(stockXml)
      );
      // stockObjects.push(...fileStockObjects);

      stockObjects[category][file.replace(".xml", "")] = fileStockObjects;
    });
  });

  res.json(stockObjects);
});

function deleteFile(category, name = "") {
  try {
    fs.rmSync("./Inventory/" + category + "/" + name, {
      recursive: true,
    });
    return 200;
  } catch (err) {
    console.log(err);
    return 400;
  }
}

function readFromFile(category, name) {
  try {
    return fs.readFileSync("./Inventory/" + category + "/" + name, {
      encoding: "utf8",
    });
  } catch (err) {
    console.log(err);
  }
}

// overwrite existing or create new file
function writeToFile(xmlData, category, name) {
  try {
    // see if the category directory exists
    fs.accessSync("./Inventory/" + category, fs.constants.F_OK);
  } catch (err) {
    // create the category as it doesn't exist
    fs.mkdirSync("./Inventory/" + category);
  } finally {
    // now write to the file
    fs.writeFile("./Inventory/" + category + "/" + name, xmlData, (err) => {
      if (err) {
        console.log(err);
      }
    });
  }
}

app.listen(port, () => {
  console.log("listening on port: ".concat(port));
});

/*
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
*/
