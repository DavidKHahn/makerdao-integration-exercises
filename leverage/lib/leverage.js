const http = require("http");
var url = require("url");
const invariant = require("invariant");

const Maker = require("@makerdao/makerdao-exchange-integration");

// descriptive logging
const debug = require("debug");
const log = {
  state: debug("leverage:state"),
  action: debug("leverage:action"),
  title: debug("leverage:header")
};

// const maker =
// Create a new Maker instance that connects to Infura. Don't forget
// to include your private key.

module.exports = async ( iterations, priceFloor, principal ) => {
  invariant(
    iterations !== undefined &&
      priceFloor !== undefined &&
      principal !== undefined,
    `Not all parameters (iterations, priceFloor, principal) were recieved`
  );

  log.title(`Creating a leveraged cdp with the following parameters:`);
  log.title(`Iterations: ${iterations}`);
  log.title(`Price Floor: $${priceFloor}`);
  log.title(`Principal: ${principal} ETH`);

  console.log(`Creating a leveraged cdp with the following parameters:`);
  console.log(`Iterations: ${iterations}`);
  console.log(`Price Floor: $${priceFloor}`);
  console.log(`Principal: ${principal} ETH`);

  await maker.authenticate();

  const [liquidationRatio, priceEth] = await Promise.all([
    maker.service("cdp").getLiquidationRatio(),
    maker.service("price").getEthPrice()
  ]);

  log.state(`Liquidation ratio: ${liquidationRatio}`);
  console.log(`Liquidation ratio: ${liquidationRatio}`);

  log.state(`Current price of ETH: ${priceEth}`);
  console.log(`Current price of ETH: ${priceEth}`);

  invariant(
    priceEth > priceFloor,
    `Price floor must be below the current oracle price`
  );

  const cdp = // Open a new CDP here.


  const id = // Get the new CDP's ID here.


  log.action(`opened cdp ${id}`);
  console.log(`opened cdp ${id}`);

  // calculate a collateralization ratio that will achieve the given price floor
  const collatRatio = (priceEth * liquidationRatio) / priceFloor;


  // Lock up all of our principal here.
  

  log.action(`locked ${principal} ETH`);
  console.log(`locked ${principal} ETH`);


  
  const initialPethCollateral = // Query the CDP for the amount of initial peth collateral here.
  console.log(` ${principal} ETH worth ${initialPethCollateral} PETH`);


  // calculate how much Dai we need to draw in order
  // to achieve the desired collateralization ratio
  let drawAmt = Math.floor((principal * priceEth) / collatRatio);
  await cdp.drawDai(drawAmt.toString());
  log.action(`drew ${drawAmt} Dai`);
  console.log(`drew ${drawAmt} Dai`);

  // do `iterations` round trip(s) to the exchange
  for (let i = 0; i < iterations; i++) {
    // exchange the drawn Dai for W-ETH
    let tx = await maker
      .service("exchange")
      .sellDai(drawAmt.toString(), "WETH");

    // observe the amount of W-ETH recieved from the exchange
    // by calling `fillAmount` on the returned transaction object
    let returnedWeth = tx.fillAmount().toString();
    log.action(`exchanged ${drawAmt} Dai for ${returnedWeth} W-ETH`);
    console.log(`exchanged ${drawAmt} Dai for ${returnedWeth} W-ETH`);

    // lock all of the W-ETH we just recieved into our CDP
    await cdp.lockWeth(returnedWeth);
    log.action(`locked ${returnedWeth} ETH`);
    console.log(`locked ${returnedWeth} ETH`);

    // calculate how much Dai we need to draw in order to
    // re-attain our desired collateralization ratio
    drawAmt = Math.floor((returnedWeth * priceEth) / collatRatio);
    await cdp.drawDai(drawAmt.toString());
    log.action(`drew ${drawAmt} Dai`);
    console.log(`drew ${drawAmt} Dai`);
  }

  // get the final state of our CDP
  const [pethCollateral, debt] = await Promise.all([
    // 1. query the CDP for the amount of PETH locked as collateral here,
    // 2. query the CDP for the amount of debt withdrawn as Dai here
  ]);

  const cdpState = {
    initialPethCollateral,
    pethCollateral,
    debt,
    id,
    principal,
    iterations,
    priceFloor,
    finalDai: drawAmt
  };

  log.state(`Created CDP: ${JSON.stringify(cdpState)}`);
  console.log(`Created CDP: ${JSON.stringify(cdpState)}`);
  
  return cdpState;
};