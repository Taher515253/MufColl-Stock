const fs = require("fs/promises");
const fsSync = require("fs");
const readlines = require("readline");

/**
 * Now this csvManager should also handle the Accounts folder
 * It should save data according to date, month and year
 */

async function getData(date, month, year) {
  [date, month, year] = validateDate(date, month, year);
  const filepath = `./Accounts/${year}/${month}/${date}.csv`;

  console.log(filepath);
  const dataArray = await readCSVFile(filepath);
  return dataArray;
}

async function writeData(dataArray, date, month, year) {
  [date, month, year] = validateDate(date, month, year);
  const filepath = `./Accounts/${year}/${month}/${date}.csv`;

  return await writeDataToFile(dataArray, filepath);
}

function appendTodayRecord(recordObject) {
  // append record to today's date
  const today = new Date();
  const month = today.toLocaleString("default", { month: "long" });
  const date = today.getDate();
  const year = today.getFullYear();
  const newRecordNumber = incrementRecordNumber();
  const indexedRecordObject = Object.assign(
    { indexNumber: newRecordNumber },
    recordObject
  );

  appendRecord(indexedRecordObject, { year, month, date });
}

function appendRecord(recordObject, dateDetails) {
  const { year, month, date } = dateDetails;
  const filepath = `./Accounts/${year}/${month}/${date}.csv`;
  const getFieldPromise = getFields(filepath);

  getFieldPromise.then((fields) => {
    let fieldArray;

    if (!fields) {
      fieldArray = Object.keys(recordObject);
      fs.appendFile(filepath, fieldArray.join(",") + "\n");
    } else fieldArray = fields.split(/,\s*/g);

    const csvLine = convertToCSVLine(fieldArray, recordObject);

    fs.appendFile(filepath, csvLine + "\n");
  });
}

async function getFields(csvFilePath) {
  try {
    const stream = fsSync.createReadStream(csvFilePath);
    const readLine = readlines.createInterface({ input: stream });
    const fieldsLine = await returnFirstLine(readLine);

    return fieldsLine;
  } catch (err) {
    const parentDir = csvFilePath.replace(/\/\d*\.csv/, "");
    if (!fsSync.existsSync(parentDir));
    fsSync.mkdirSync(parentDir, { recursive: true });

    return null;
  }

  function returnFirstLine(readLineInterface) {
    return new Promise((resolve, reject) => {
      readLineInterface.once("line", (data) => {
        resolve(data);
      });

      readLineInterface.on("error", () => {
        reject("File does not exist");
      });
    });
  }
}

function incrementRecordNumber() {
  try {
    const serverData = fsSync.readFileSync("./server_data.json");
    const serverDataObject = JSON.parse(serverData);

    const date = serverDataObject.date;
    let newRecordNumber;

    // is it a new date
    if (date != new Date().toDateString()) {
      serverDataObject.date = new Date().toDateString();
      serverDataObject.currentRecordNumber = 1;
      newRecordNumber = 1;
    } else {
      serverDataObject.currentRecordNumber += 1;
      newRecordNumber = serverDataObject.currentRecordNumber;
    }

    fsSync.writeFileSync(
      "./server_data.json",
      JSON.stringify(serverDataObject)
    );
    return newRecordNumber;
  } catch (err) {
    // means the file has not been created yet
    const serverDataObject = {
      date: new Date().toDateString(),
      currentRecordNumber: 1,
    };

    fsSync.writeFileSync(
      "./server_data.json",
      JSON.stringify(serverDataObject)
    );
    return 1;
  }
}

// getFields("./Accounts/2024/March/20.csv");

// to improve this function to properly validate the date data
function validateDate(date, month, year) {
  const currentDate = new Date();

  if (!date) date = currentDate.getDate();

  if (!month) month = currentDate.getMonth() + 1;

  if (!year) year = currentDate.getFullYear();

  return [date, month, year];
}

async function openFileForRead(filepath) {
  try {
    const fileHandle = await fs.open(filepath);
    return fileHandle;
  } catch (err) {
    throw "Check the filepath, probably incorrect";
  }
}

async function readCSVFile(filepath) {
  try {
    const file = await openFileForRead(filepath);

    const lines = file.readLines();
    const data = [];
    let firstLine = true;
    const fields = [];

    for await (const line of lines) {
      if (firstLine) {
        // the firstline must specify the columnnames
        fields.push(...line.replace(/[\n\r]/g, "").split(","));
        firstLine = false;
        continue;
      }

      line.replace(/[\n\r]/g, "");
      const details = parseLine(line, fields, 0);
      data.push(details);
    }

    return data;
  } catch (err) {
    console.log(err);
    return [];
  }
}

function parseLine(csvLine, fieldNames, primaryIndexRow = -1) {
  const details = csvLine.split(",");

  const dataObject = {};
  fieldNames.forEach((field, index) => {
    if (index === primaryIndexRow)
      return (dataObject.indexNumber = parseInt(details[index]));

    dataObject[String(field).trim()] = details[index];
  });

  return dataObject;
}

// TEST CASES!!!

// console.log(parseLine("2,4003,cooker,3000,33,12"));
// readCSVFile("./Invevntest.csv").then((result) => {
//   console.log(result);
//   console.log();
//   console.log(convertToCSVData(result));
// });
// const object = parseLine("2,4003,cooker,3000,33,12", [
//   "order",
//   "id",
//   "name",
//   "price",
//   "size",
//   "row",
// ]);
// console.log(
//   convertToCSVLine(["name", "order", "price", "size", "row"], object)
// );

async function writeDataToFile(dataArray, filepath) {
  const csvData = convertToCSVData(dataArray);

  await fs.writeFile(filepath, csvData);
}

function convertToCSVData(dataArray) {
  const sampleObject = dataArray[0];
  const fields = Object.keys(sampleObject);
  let csvData = fields.join(",") + "\n";

  for (const dataObject of dataArray) {
    const csvLine = convertToCSVLine(fields, dataObject);
    csvData = csvData.concat(csvLine, "\n");
  }

  return csvData;
}

function convertToCSVLine(fields, dataObject) {
  const details = [];

  fields.forEach((field) => {
    details.push(dataObject[field]);
  });

  return details.join(",");
}

//exports
module.exports = { getData, writeData, appendTodayRecord };
