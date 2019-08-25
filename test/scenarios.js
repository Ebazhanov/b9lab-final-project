/* global web3 assert artifacts contract describe before beforeEach it */
const Regulator = artifacts.require("Regulator");
const TollBoothOperator = artifacts.require("TollBoothOperator");
const randomIntIn = require("../utils/randomIntIn.js");
const toBytes32 = require("../utils/toBytes32.js");

// This is where you write your test scenarios as per the README.

contract("Scenarios", function(accounts) {
    const[owner0, owner1,booth0, booth1, booth2,vehicle0, vehicle1,anyone] = accounts;
    const price01 = randomIntIn(1, 1000);
    var deposit0 = price01 + randomIntIn(1, 1000);
    var routePrice =  price01 + randomIntIn(1, 1000);
    var deposit1 = deposit0 + randomIntIn(1, 1000);
    const vehicleType0 = randomIntIn(1, 1000);
    const vehicleType1 = vehicleType0 + randomIntIn(1, 1000);
    var multiplier0 = randomIntIn(1, 1000);
    var multiplier1 = multiplier0 + randomIntIn(1, 1000);
    const tmpSecret = randomIntIn(1, 1000);
    const secret0 = toBytes32(tmpSecret);
    const secret1 = toBytes32(tmpSecret + randomIntIn(1, 1000));

    const getEventResult = (txObj, eventName) => {
        const event = txObj.logs.find(log => log.event === eventName);
        if (event) {
          return event.args;
        } else {
          return undefined;
        }
      };
    // Add as many `before`, `beforeEach`, `describe`, `afterEach`, `after` as you want.
    // But no additional `it`.

    let regulator, operator, hashed0, hashed1;

        beforeEach("should deploy regulator and operator", async function() {
          multiplier0 = 1;
          multiplier1 = 1;
          deposit0 = 1;
            regulator = await Regulator.new({ from: owner0 });
            //console.log(regulator);
            var tx = await regulator.setVehicleType(vehicle0, vehicleType0, { from: owner0 });
            assert.isTrue(tx.receipt.status,"transaction must be succesful");
            tx = await regulator.setVehicleType(vehicle1, vehicleType1, { from: owner0 });
            assert.isTrue(tx.receipt.status,"transaction must be succesful");
            tx = await regulator.createNewOperator(owner1, deposit0, { from: owner0 });
            assert.isTrue(tx.receipt.status,"transaction must be succesful");
            operator = await TollBoothOperator.at(tx.logs[1].args.newOperator);
            //console.log(operator);
            tx = await operator.addTollBooth(booth0, { from: owner1 });
            assert.isTrue(tx.receipt.status,"transaction must be succesful");
            tx = await operator.addTollBooth(booth1, { from: owner1 });
            assert.isTrue(tx.receipt.status,"transaction must be succesful");
            tx = await operator.addTollBooth(booth2, { from: owner1 });
            assert.isTrue(tx.receipt.status,"transaction must be succesful");
            tx = await operator.setMultiplier(vehicleType0, multiplier0, { from: owner1 });
            assert.isTrue(tx.receipt.status,"transaction must be succesful");
            tx = await operator.setMultiplier(vehicleType1, multiplier1, { from: owner1 });
            assert.isTrue(tx.receipt.status,"transaction must be succesful");
            /*
            tx = await operator.setRoutePrice(booth0, booth1, price01, { from: owner1 });
            assert.isTrue(tx.receipt.status,"transaction must be succesful");
            */
            tx = await operator.setPaused(false, { from: owner1 });
            hashed0 = await operator.hashSecret(secret0);
            hashed1 = await operator.hashSecret(secret1);
        });

        it("Scenario 1", async function() {
          deposit1 = 10;
          routePrice = 10;
          var tx = await operator.setDeposit(deposit1,{ from: owner1 });
          assert.isTrue(tx.receipt.status,"transaction must be succesful");
          tx = await operator.setRoutePrice(booth0,booth1,routePrice,{ from: owner1 });
          assert.isTrue(tx.receipt.status,"transaction must be succesful");
              const success = await operator.enterRoad.call(
                booth0, hashed0, { from: vehicle0, value: (deposit1 * multiplier0)});
        assert.isTrue(success);
        const txObj = await operator.enterRoad(
                booth0, hashed0, { from: vehicle0, value: (deposit1 * multiplier0)});
        assert.isTrue(txObj.receipt.status,"transaction must be succesful");
        assert.strictEqual(txObj.receipt.logs.length, 1);
        assert.strictEqual(txObj.logs.length, 1);
        const logEntered = txObj.logs[0];
        assert.strictEqual(logEntered.event, "LogRoadEntered");
        assert.strictEqual(logEntered.args.vehicle, vehicle0);
        assert.strictEqual(logEntered.args.entryBooth, booth0);
        assert.strictEqual(logEntered.args.exitSecretHashed, hashed0);
        assert.strictEqual(logEntered.args.multiplier.toNumber(), multiplier0);
        assert.strictEqual(logEntered.args.depositedWeis.toNumber(), (deposit1 * multiplier0));
        const info = await operator.getVehicleEntry(hashed0);
        assert.strictEqual(info[0], vehicle0);
        assert.strictEqual(info[1], booth0);
        assert.strictEqual(info[2].toNumber(), multiplier0);
        assert.strictEqual(info[3].toNumber(), (deposit1 * multiplier0));
        const operatorBal = await web3.eth.getBalance(operator.address);
        var collected = await operator.getPayment(owner1);
        var vehicle0Due = await operator.getPayment(vehicle0);
        assert.strictEqual(operatorBal, (deposit1 * multiplier0).toString());
        assert.strictEqual(collected.toNumber(), 0);
        assert.strictEqual(vehicle0Due.toNumber(), 0);

        const txObj1 = await operator.reportExitRoad(secret0,{from:booth1});
        assert.isTrue(txObj1.receipt.status,"transaction must be succesful");
        const logExit = txObj1.logs[0];
        assert.strictEqual(logExit.event, "LogRoadExited");
        assert.strictEqual(logExit.args.exitSecretHashed, hashed0);
        assert.strictEqual(logExit.args.exitBooth, booth1);
        assert.strictEqual(logExit.args.finalFee.toNumber(), routePrice);

        collected = await operator.getPayment(owner1);
        vehicle0Due = await operator.getPayment(vehicle0);
        assert.strictEqual(collected.toNumber(), deposit1);
        assert.strictEqual(vehicle0Due.toNumber(), (deposit1-routePrice));
      });

      it("Scenario 2", async function() {
        routePrice = 15;
        deposit0 = 10;
        deposit1 = 10;
        var tx = await operator.setDeposit(deposit0,{ from: owner1 });
          assert.isTrue(tx.receipt.status,"transaction must be succesful");
        tx = await operator.setRoutePrice(booth0,booth1,routePrice,{ from: owner1 });
        assert.isTrue(tx.receipt.status,"transaction must be succesful");
            const success = await operator.enterRoad.call(
              booth0, hashed0, { from: vehicle0, value: (deposit1 * multiplier0)});
      assert.isTrue(success);
      const txObj = await operator.enterRoad(
              booth0, hashed0, { from: vehicle0, value: (deposit1 * multiplier0)});
      assert.isTrue(txObj.receipt.status,"transaction must be succesful");
      assert.strictEqual(txObj.receipt.logs.length, 1);
      assert.strictEqual(txObj.logs.length, 1);
      const logEntered = txObj.logs[0];
      assert.strictEqual(logEntered.event, "LogRoadEntered");
      assert.strictEqual(logEntered.args.vehicle, vehicle0);
      assert.strictEqual(logEntered.args.entryBooth, booth0);
      assert.strictEqual(logEntered.args.exitSecretHashed, hashed0);
      assert.strictEqual(logEntered.args.multiplier.toNumber(), multiplier0);
      assert.strictEqual(logEntered.args.depositedWeis.toNumber(), (deposit1 * multiplier0));
      const info = await operator.getVehicleEntry(hashed0);
      assert.strictEqual(info[0], vehicle0);
      assert.strictEqual(info[1], booth0);
      assert.strictEqual(info[2].toNumber(), multiplier0);
      assert.strictEqual(info[3].toNumber(), (deposit1 * multiplier0));
      const operatorBal = await web3.eth.getBalance(operator.address);
      var collected = await operator.getPayment(owner1);
      var vehicle0Due = await operator.getPayment(vehicle0);
      assert.strictEqual(operatorBal, (deposit1 * multiplier0).toString());
      assert.strictEqual(collected.toNumber(), 0);
      assert.strictEqual(vehicle0Due.toNumber(), 0);

      const txObj1 = await operator.reportExitRoad(secret0,{from:booth1});
      assert.isTrue(txObj1.receipt.status,"transaction must be succesful");
      const logExit = txObj1.logs[0];
      assert.strictEqual(logExit.event, "LogRoadExited");
      assert.strictEqual(logExit.args.exitSecretHashed, hashed0);
      assert.strictEqual(logExit.args.exitBooth, booth1);
      assert.strictEqual(logExit.args.finalFee.toNumber(), deposit1);

      collected = await operator.getPayment(owner1);
      vehicle0Due = await operator.getPayment(vehicle0);
      assert.strictEqual(collected.toNumber(), deposit1);
      assert.strictEqual(vehicle0Due.toNumber(), 0);
      });

      it("scenario 3", async function() {
        routePrice = 6;
        deposit0 = 10;
        deposit1 = 10;
        var tx = await operator.setDeposit(deposit0,{ from: owner1 });
        assert.isTrue(tx.receipt.status,"transaction must be succesful");
        var tx = await operator.setRoutePrice(booth0,booth1,routePrice,{ from: owner1 });
        assert.isTrue(tx.receipt.status,"transaction must be succesful");
            const success = await operator.enterRoad.call(
              booth0, hashed0, { from: vehicle0, value: (deposit1 * multiplier0)});
      assert.isTrue(success);
      const txObj = await operator.enterRoad(
              booth0, hashed0, { from: vehicle0, value: (deposit1 * multiplier0)});
      assert.isTrue(txObj.receipt.status,"transaction must be succesful");
      assert.strictEqual(txObj.receipt.logs.length, 1);
      assert.strictEqual(txObj.logs.length, 1);
      const logEntered = txObj.logs[0];
      assert.strictEqual(logEntered.event, "LogRoadEntered");
      assert.strictEqual(logEntered.args.vehicle, vehicle0);
      assert.strictEqual(logEntered.args.entryBooth, booth0);
      assert.strictEqual(logEntered.args.exitSecretHashed, hashed0);
      assert.strictEqual(logEntered.args.multiplier.toNumber(), multiplier0);
      assert.strictEqual(logEntered.args.depositedWeis.toNumber(), (deposit1 * multiplier0));
      const info = await operator.getVehicleEntry(hashed0);
      assert.strictEqual(info[0], vehicle0);
      assert.strictEqual(info[1], booth0);
      assert.strictEqual(info[2].toNumber(), multiplier0);
      assert.strictEqual(info[3].toNumber(), (deposit1 * multiplier0));
      const operatorBal = await web3.eth.getBalance(operator.address);
      var collected = await operator.getPayment(owner1);
      var vehicle0Due = await operator.getPayment(vehicle0);
      assert.strictEqual(operatorBal, (deposit1 * multiplier0).toString());
      assert.strictEqual(collected.toNumber(), 0);
      assert.strictEqual(vehicle0Due.toNumber(), 0);

      const txObj1 = await operator.reportExitRoad(secret0,{from:booth1});
      assert.isTrue(txObj1.receipt.status,"transaction must be succesful");
      const logExit = txObj1.logs[0];
      assert.strictEqual(logExit.event, "LogRoadExited");
      assert.strictEqual(logExit.args.exitSecretHashed, hashed0);
      assert.strictEqual(logExit.args.exitBooth, booth1);
      assert.strictEqual(logExit.args.finalFee.toNumber(), routePrice);

      collected = await operator.getPayment(owner1);
      vehicle0Due = await operator.getPayment(vehicle0);
      assert.strictEqual(collected.toNumber(), routePrice);
      assert.strictEqual(vehicle0Due.toNumber(), (deposit0-routePrice));
      });

      it("scenario 4", async function() {
        routePrice = 10;
        deposit0 = 10;
        deposit1 = 14;
        var tx = await operator.setDeposit(deposit0,{ from: owner1 });
        assert.isTrue(tx.receipt.status,"transaction must be succesful");
        var tx = await operator.setRoutePrice(booth0,booth1,routePrice,{ from: owner1 });
        assert.isTrue(tx.receipt.status,"transaction must be succesful");
            const success = await operator.enterRoad.call(
              booth0, hashed0, { from: vehicle0, value: (deposit1 * multiplier0)});
      assert.isTrue(success);
      const txObj = await operator.enterRoad(
              booth0, hashed0, { from: vehicle0, value: (deposit1 * multiplier0)});
      assert.isTrue(txObj.receipt.status,"transaction must be succesful");
      assert.strictEqual(txObj.receipt.logs.length, 1);
      assert.strictEqual(txObj.logs.length, 1);
      const logEntered = txObj.logs[0];
      assert.strictEqual(logEntered.event, "LogRoadEntered");
      assert.strictEqual(logEntered.args.vehicle, vehicle0);
      assert.strictEqual(logEntered.args.entryBooth, booth0);
      assert.strictEqual(logEntered.args.exitSecretHashed, hashed0);
      assert.strictEqual(logEntered.args.multiplier.toNumber(), multiplier0);
      assert.strictEqual(logEntered.args.depositedWeis.toNumber(), (deposit1 * multiplier0));
      const info = await operator.getVehicleEntry(hashed0);
      assert.strictEqual(info[0], vehicle0);
      assert.strictEqual(info[1], booth0);
      assert.strictEqual(info[2].toNumber(), multiplier0);
      assert.strictEqual(info[3].toNumber(), (deposit1 * multiplier0));
      const operatorBal = await web3.eth.getBalance(operator.address);
      var collected = await operator.getPayment(owner1);
      var vehicle0Due = await operator.getPayment(vehicle0);
      assert.strictEqual(operatorBal, (deposit1 * multiplier0).toString());
      assert.strictEqual(collected.toNumber(), 0);
      assert.strictEqual(vehicle0Due.toNumber(), 0);

      const txObj1 = await operator.reportExitRoad(secret0,{from:booth1});
      assert.isTrue(txObj1.receipt.status,"transaction must be succesful");
      const logExit = txObj1.logs[0];
      assert.strictEqual(logExit.event, "LogRoadExited");
      assert.strictEqual(logExit.args.exitSecretHashed, hashed0);
      assert.strictEqual(logExit.args.exitBooth, booth1);
      assert.strictEqual(logExit.args.finalFee.toNumber(), routePrice);

      collected = await operator.getPayment(owner1);
      vehicle0Due = await operator.getPayment(vehicle0);
      assert.strictEqual(collected.toNumber(), routePrice);
      assert.strictEqual(vehicle0Due.toNumber(), (deposit1-routePrice));
      });

      it("scenario 5", async function() {
        routePrice = 10;
        deposit0 = 10;
        deposit1 = 14;
        var tx = await operator.setDeposit(deposit0,{ from: owner1 });
        assert.isTrue(tx.receipt.status,"transaction must be succesful");
        var tx = await operator.setRoutePrice(booth0,booth1,routePrice,{ from: owner1 });
        assert.isTrue(tx.receipt.status,"transaction must be succesful");
            const success = await operator.enterRoad.call(
              booth0, hashed0, { from: vehicle0, value: (deposit1 * multiplier0)});
      assert.isTrue(success);
      const txObj = await operator.enterRoad(
              booth0, hashed0, { from: vehicle0, value: (deposit1 * multiplier0)});
      assert.isTrue(txObj.receipt.status,"transaction must be succesful");
      assert.strictEqual(txObj.receipt.logs.length, 1);
      assert.strictEqual(txObj.logs.length, 1);
      const logEntered = txObj.logs[0];
      assert.strictEqual(logEntered.event, "LogRoadEntered");
      assert.strictEqual(logEntered.args.vehicle, vehicle0);
      assert.strictEqual(logEntered.args.entryBooth, booth0);
      assert.strictEqual(logEntered.args.exitSecretHashed, hashed0);
      assert.strictEqual(logEntered.args.multiplier.toNumber(), multiplier0);
      assert.strictEqual(logEntered.args.depositedWeis.toNumber(), (deposit1 * multiplier0));
      const info = await operator.getVehicleEntry(hashed0);
      assert.strictEqual(info[0], vehicle0);
      assert.strictEqual(info[1], booth0);
      assert.strictEqual(info[2].toNumber(), multiplier0);
      assert.strictEqual(info[3].toNumber(), (deposit1 * multiplier0));
      const operatorBal = await web3.eth.getBalance(operator.address);
      var collected = await operator.getPayment(owner1);
      var vehicle0Due = await operator.getPayment(vehicle0);
      assert.strictEqual(operatorBal, (deposit1 * multiplier0).toString());
      assert.strictEqual(collected.toNumber(), 0);
      assert.strictEqual(vehicle0Due.toNumber(), 0);

      const txObj1 = await operator.reportExitRoad(secret0,{from:booth1});
      assert.isTrue(txObj1.receipt.status,"transaction must be succesful");
      const logExit = txObj1.logs[0];
      assert.strictEqual(logExit.event, "LogRoadExited");
      assert.strictEqual(logExit.args.exitSecretHashed, hashed0);
      assert.strictEqual(logExit.args.exitBooth, booth1);
      assert.strictEqual(logExit.args.finalFee.toNumber(), routePrice);

      collected = await operator.getPayment(owner1);
      vehicle0Due = await operator.getPayment(vehicle0);
      assert.strictEqual(collected.toNumber(), routePrice);
      assert.strictEqual(vehicle0Due.toNumber(), (deposit1-routePrice));
      });

      
      it("scenario 6", async function() {
        routePrice = 6;
        deposit0 = 10;
        deposit1 = 14;
        var tx = await operator.setDeposit(deposit0,{ from: owner1 });
        assert.isTrue(tx.receipt.status,"transaction must be succesful");
        //var tx = await operator.setRoutePrice(booth0,booth1,routePrice,{ from: owner1 });
        //assert.isTrue(tx.receipt.status,"transaction must be succesful");
      var routeObj = await operator.getRoutePrice.call(booth0,booth1,{from:owner1});
      assert.strictEqual(routeObj.toNumber(), 0);
      var success = await operator.enterRoad.call(
              booth0, hashed0, { from: vehicle0, value: (deposit1 * multiplier0)});
      assert.isTrue(success);
      var txObj = await operator.enterRoad(
              booth0, hashed0, { from: vehicle0, value: (deposit1 * multiplier0)});
      assert.isTrue(txObj.receipt.status,"transaction must be succesful");
      assert.strictEqual(txObj.receipt.logs.length, 1);
      assert.strictEqual(txObj.logs.length, 1);
      var logEntered = txObj.logs[0];
      assert.strictEqual(logEntered.event, "LogRoadEntered");
      assert.strictEqual(logEntered.args.vehicle, vehicle0);
      assert.strictEqual(logEntered.args.entryBooth, booth0);
      assert.strictEqual(logEntered.args.exitSecretHashed, hashed0);
      assert.strictEqual(logEntered.args.multiplier.toNumber(), multiplier0);
      assert.strictEqual(logEntered.args.depositedWeis.toNumber(), (deposit1 * multiplier0));
      const info = await operator.getVehicleEntry(hashed0);
      assert.strictEqual(info[0], vehicle0);
      assert.strictEqual(info[1], booth0);
      assert.strictEqual(info[2].toNumber(), multiplier0);
      assert.strictEqual(info[3].toNumber(), (deposit1 * multiplier0));
      const operatorBal = await web3.eth.getBalance(operator.address);
      var collected = await operator.getPayment(owner1);
      var vehicle0Due = await operator.getPayment(vehicle0);
      assert.strictEqual(operatorBal, (deposit1 * multiplier0).toString());
      assert.strictEqual(collected.toNumber(), 0);
      assert.strictEqual(vehicle0Due.toNumber(), 0);

      var txObj1 = await operator.reportExitRoad(secret0,{from:booth1});
      assert.isTrue(txObj1.receipt.status,"transaction must be succesful");
      var logExit = txObj1.logs[0];
      assert.strictEqual(logExit.event, "LogPendingPayment");
      assert.strictEqual(logExit.args.exitSecretHashed, hashed0);
      assert.strictEqual(logExit.args.exitBooth, booth1);
      assert.strictEqual(logExit.args.entryBooth, booth0);

      collected = await operator.getPayment(owner1);
      vehicle0Due = await operator.getPayment(vehicle0);
      assert.strictEqual(collected.toNumber(), 0);
      assert.strictEqual(vehicle0Due.toNumber(), 0);

      success = await operator.enterRoad.call(
        booth0, hashed1, { from: vehicle1, value: (deposit0 * multiplier0)});
      assert.isTrue(success);
      txObj = await operator.enterRoad(
              booth0, hashed1, { from: vehicle1, value: (deposit0 * multiplier0)});
      assert.isTrue(txObj.receipt.status,"transaction must be succesful");
      assert.strictEqual(txObj.receipt.logs.length, 1);
      assert.strictEqual(txObj.logs.length, 1);
      logEntered = txObj.logs[0];
      assert.strictEqual(logEntered.event, "LogRoadEntered");
      assert.strictEqual(logEntered.args.vehicle, vehicle1);
      assert.strictEqual(logEntered.args.entryBooth, booth0);
      assert.strictEqual(logEntered.args.exitSecretHashed, hashed1);
      assert.strictEqual(logEntered.args.multiplier.toNumber(), multiplier0);
      assert.strictEqual(logEntered.args.depositedWeis.toNumber(), (deposit0 * multiplier0));

      txObj1 = await operator.reportExitRoad(secret1,{from:booth1});
      assert.isTrue(txObj1.receipt.status,"transaction must be succesful");
      logExit = txObj1.logs[0];
      assert.strictEqual(logExit.event, "LogPendingPayment");
      assert.strictEqual(logExit.args.exitSecretHashed, hashed1);
      assert.strictEqual(logExit.args.exitBooth, booth1);
      assert.strictEqual(logExit.args.entryBooth, booth0);

      collected = await operator.getPayment(owner1);
      vehicle0Due = await operator.getPayment(vehicle1);
      assert.strictEqual(collected.toNumber(), 0);
      assert.strictEqual(vehicle0Due.toNumber(), 0);

      routeObj = await operator.getRoutePrice.call(booth0,booth1,{from:owner1});
      assert.strictEqual(routeObj.toNumber(), 0);

      var pending = await operator.getPendingPaymentCount.call(booth0,booth1);
      assert.strictEqual(pending.toNumber(), 2);

      var route = await operator.setRoutePrice(booth0,booth1,routePrice,{from:owner1});
      assert.isTrue(route.receipt.status,"transaction must be succesful");
      var logRes = route.logs[1];
      assert.strictEqual(logRes.event, "LogRoadExited");
      assert.strictEqual(logRes.args.exitSecretHashed, hashed0);
      assert.strictEqual(logRes.args.exitBooth, booth1);
      assert.strictEqual(logRes.args.finalFee.toNumber(), routePrice);

      collected = await operator.getPayment(owner1);
      vehicle0Due = await operator.getPayment(vehicle0);
      assert.strictEqual(collected.toNumber(), routePrice);
      assert.strictEqual(vehicle0Due.toNumber(), (deposit1-routePrice));

      var clear = await operator.clearSomePendingPayments(booth0,booth1,1,{from:anyone});
      assert.isTrue(clear.receipt.status,"transaction must be succesful");
      var cleared = clear.logs[0];
      assert.strictEqual(cleared.event, "LogRoadExited");
      assert.strictEqual(cleared.args.exitSecretHashed, hashed1);
      assert.strictEqual(cleared.args.exitBooth, booth1);
      assert.strictEqual(cleared.args.finalFee.toNumber(), routePrice);

      collected = await operator.getPayment(owner1);
      vehicle0Due = await operator.getPayment(vehicle1);
      assert.strictEqual(collected.toNumber(), routePrice*2);
      assert.strictEqual(vehicle0Due.toNumber(), (deposit0-routePrice));
      });

});
