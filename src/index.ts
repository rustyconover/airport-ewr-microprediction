// What this code does is download the latest load information and publishes to microprediction.org
import { MicroWriter, MicroWriterConfig, MicroReader } from "microprediction";
import { stream_write_keys } from "./write-keys";
const bent = require("bent");

import * as _ from "lodash";
const getJSON = bent("json");
import { ScheduledHandler } from "aws-lambda";
import S3 from "aws-sdk/clients/s3";

type EmojiRecord = {
  name: string;
  score: number;
};

async function getParking(): Promise<
  Array<{
    parkingLot: string;
    title: string;
    percentageOccupied: string;
  }>
> {
  // The file is updated every five minutes.
  return getJSON(
    "https://avi-prod-mpp-webapp-api.azurewebsites.net/api/v1/parking/EWR",
    undefined,
    {
      Referer: "https://www.newarkairport.com/to-from-airport/parking",
    }
  );
}

async function getTSATimes(): Promise<
  Array<{
    title: string;
    timeInMinutes: number;
    passengerCount: number;
    gate: string;
    queueType: string;
    queueOpen: boolean;
  }>
> {
  return getJSON(
    "https://avi-prod-mpp-webapp-api.azurewebsites.net/api/v1/SecurityWaitTimesPoints/EWR",
    undefined,
    {
      Referer: "https://www.newarkairport.com/",
    }
  );
}

async function pushTSA() {
  const tsa = await getTSATimes();

  const writes = [];
  for (const record of tsa) {
    const value = record.timeInMinutes;
    const name = `${record.title} ${record.gate} ${record.queueType}`
      .toLowerCase()
      .replace(/ /g, "_")
      .replace(/,/g, "");

    if (stream_write_keys[name] != null) {
      let config = await MicroWriterConfig.create({
        write_key: stream_write_keys[name],
      });
      const writer = new MicroWriter(config);
      // Skip closed TSA positions.
      if (record.queueOpen === false) {
        continue;
      }

      console.log("Writing", name, value);
      writes.push(writer.set(`airport-ewr-security-wait-${name}.json`, value));
    } else {
      console.error(`Unknown security name: ${name}`);
    }
  }
  await Promise.all(writes);
}

async function pushParking() {
  const parking = await getParking();

  const writes = [];
  for (const { title, percentageOccupied } of parking) {
    const value = parseFloat(percentageOccupied);
    const name = title.toLowerCase().replace(/ /g, "_").replace(/,/g, "");

    if (stream_write_keys[name] != null) {
      let config = await MicroWriterConfig.create({
        write_key: stream_write_keys[name],
      });
      const writer = new MicroWriter(config);
      console.log("Writing", name, value);
      writes.push(writer.set(`airport-ewr-${name}.json`, value));
    } else {
      console.error(`Unknown parking name: ${name}`);
    }
  }
  await Promise.all(writes);
}

export const handler: ScheduledHandler<any> = async (event) => {
  console.log("Fetching data");
  await Promise.all([pushParking(), pushTSA()]);
};
