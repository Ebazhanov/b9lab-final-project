/* global web3 assert artifacts contract describe before beforeEach it */

const fs = require("fs");
const path = require('path');
const expectedExceptionPromise = require("../../utils/expectedException.js");
const randomIntIn = require("../../utils/randomIntIn.js");
const toBytes32 = require("../../utils/toBytes32.js");
const metaInfoSaver = require("../../utils/metaInfoSaver.js")(fs);

const Regulator = artifacts.require("./Regulator.sol");
const TollBoothOperator = artifacts.require("./TollBoothOperator.sol");
const { fromWei, padLeft, toBN } = web3.utils;

const maxGas = 15000000;

contract("TollBoothOperator", function(accounts) {

    let owner0, owner1,
        booth0, booth1, booth2,
        vehicle0, vehicle1;
    const addressZero = padLeft(0, 40);
    const price01 = randomIntIn(1, 1000);
    const deposit0 = price01 + randomIntIn(1, 1000);
    const deposit1 = deposit0 + randomIntIn(1, 1000);
    const vehicleType0 = randomIntIn(1, 1000);
    const vehicleType1 = vehicleType0 + randomIntIn(1, 1000);
    const multiplier0 = randomIntIn(1, 1000);
    const multiplier1 = multiplier0 + randomIntIn(1, 1000);
    const tmpSecret = randomIntIn(1, 1000);
    const secret0 = toBytes32(tmpSecret);
    const secret1 = toBytes32(tmpSecret + randomIntIn(1, 1000));

    before("should prepare", async function() {
        assert.isAtLeast(accounts.length, 8);
        [ owner0, owner1, booth0, booth1, booth2, vehicle0, vehicle1 ] = accounts;
        const owner0Bal = await web3.eth.getBalance(owner0);
        assert.isAtLeast(parseInt(fromWei(owner0Bal)), 10);
    });

    after("should save meta info", async function() {
        const dirNameElements = __dirname.split(path.sep);
        const dirName = dirNameElements[dirNameElements.length - 1];
        metaInfoSaver(
            this.test.parent,
            __dirname + "/../../result/" + dirName,
            path.basename(__filename) + ".points.json");
    });

    describe("deploy", function() {

        it("should not be possible to deploy a TollBoothOperator with deposit 0 - 1", async function() {
            this.test.b9Points = 0;
            this.test.b9MustPass = "failsCode";
            return expectedExceptionPromise(
                () => TollBoothOperator.new(false, 0, owner0, { from: owner1, gas: maxGas }),
                maxGas);
        });

        it("should be possible to deploy a TollBoothOperator with parameters - 1", async function() {
            this.test.b9Points = 0;
            this.test.b9MustPass = "failsCode";
            const operator = await TollBoothOperator.new(false, deposit0, owner0, { from: owner1 });
            assert.isFalse(await operator.isPaused());
            assert.strictEqual((await operator.getDeposit()).toNumber(), deposit0);
            assert.strictEqual(await operator.getOwner(), owner1);
            assert.strictEqual(await operator.getRegulator(), owner0);
        });

    });

    describe("Vehicle Operations", function() {

        let regulator, operator, hashed0, hashed1;

        beforeEach("should deploy regulator and operator", async function() {
            regulator = await Regulator.new({ from: owner0 });
            await regulator.setVehicleType(vehicle0, vehicleType0, { from: owner0 });
            await regulator.setVehicleType(vehicle1, vehicleType1, { from: owner0 });
            const txObj = await regulator.createNewOperator(owner1, deposit0, { from: owner0 });
            operator = await TollBoothOperator.at(txObj.logs[1].args.newOperator);
            await operator.addTollBooth(booth0, { from: owner1 });
            await operator.addTollBooth(booth1, { from: owner1 });
            await operator.addTollBooth(booth2, { from: owner1 });
            await operator.setMultiplier(vehicleType0, multiplier0, { from: owner1 });
            await operator.setMultiplier(vehicleType1, multiplier1, { from: owner1 });
            await operator.setRoutePrice(booth0, booth1, price01, { from: owner1 });
            await operator.setPaused(false, { from: owner1 });
            hashed0 = await operator.hashSecret(secret0);
            hashed1 = await operator.hashSecret(secret1);
        });

        describe("enterRoad", function() {

            it("should not be possible to enter road if paused", async function() {
                this.test.b9Points = 0;
                this.test.b9MustPass = "failsCode";
                await operator.setPaused(true, { from: owner1 });
                await expectedExceptionPromise(
                    () => operator.enterRoad(
                        booth0, hashed0,
                        { from: vehicle0, value: deposit0 * multiplier0, gas: maxGas }),
                    maxGas);
            });

            it("should be possible to enter road with more than required deposit", async function() {
                this.test.b9Points = 0;
                this.test.b9MustPass = "failsCode";
                const success = await operator.enterRoad.call(
                        booth0, hashed0, { from: vehicle0, value: (deposit0 * multiplier0) + 1 });
                assert.isTrue(success);
                const txObj = await operator.enterRoad(
                        booth0, hashed0, { from: vehicle0, value: (deposit0 * multiplier0) + 1 });
                assert.strictEqual(txObj.receipt.logs.length, 1);
                assert.strictEqual(txObj.logs.length, 1);
                const logEntered = txObj.logs[0];
                assert.strictEqual(logEntered.event, "LogRoadEntered");
                assert.strictEqual(logEntered.args.vehicle, vehicle0);
                assert.strictEqual(logEntered.args.entryBooth, booth0);
                assert.strictEqual(logEntered.args.exitSecretHashed, hashed0);
                assert.strictEqual(logEntered.args.multiplier.toNumber(), multiplier0);
                assert.strictEqual(logEntered.args.depositedWeis.toNumber(), (deposit0 * multiplier0) + 1);
                const info = await operator.getVehicleEntry(hashed0);
                assert.strictEqual(info[0], vehicle0);
                assert.strictEqual(info[1], booth0);
                assert.strictEqual(info[2].toNumber(), multiplier0);
                assert.strictEqual(info[3].toNumber(), (deposit0 * multiplier0) + 1);
                const operatorBal = await web3.eth.getBalance(operator.address);
                const collected = await operator.getPayment(owner1);
                const vehicle0Due = await operator.getPayment(vehicle0);
                assert.strictEqual(operatorBal, (deposit0 * multiplier0 + 1).toString());
                assert.strictEqual(collected.toNumber(), 0);
                assert.strictEqual(vehicle0Due.toNumber(), 0);
            });

        });

        describe("reportExitRoad with excessive deposited", function() {

            const extraDeposit = randomIntIn(1, 1000);
            let vehicleInitBal;

            beforeEach("should enter road with excessive deposit", async function() {
                await operator.enterRoad(
                    booth0, hashed0, { from: vehicle0, value: (deposit0 + extraDeposit) * multiplier0 });
                vehicleInitBal = await web3.eth.getBalance(vehicle0);
            });

            it("should be possible to report exit road on route with known price below deposited", async function() {
                this.test.b9Points = 0;
                this.test.b9MustPass = "failsCode";
                await operator.setRoutePrice(booth0, booth1, deposit0, { from: owner1 });
                const result = await operator.reportExitRoad.call(secret0, { from: booth1 });
                assert.strictEqual(result.toNumber(), 1);
                const txObj = await operator.reportExitRoad(secret0, { from: booth1 });
                assert.strictEqual(txObj.receipt.logs.length, 1);
                assert.strictEqual(txObj.logs.length, 1);
                const logExited = txObj.logs[0];
                assert.strictEqual(logExited.event, "LogRoadExited");
                assert.strictEqual(logExited.args.exitBooth, booth1);
                assert.strictEqual(logExited.args.exitSecretHashed, hashed0);
                assert.strictEqual(logExited.args.finalFee.toNumber(), deposit0 * multiplier0);
                assert.strictEqual(logExited.args.refundWeis.toNumber(), extraDeposit * multiplier0);
                const info0 = await operator.getVehicleEntry(hashed0);
                const pendingCount01 = await operator.getPendingPaymentCount(booth0, booth1);
                const pendingCount02 = await operator.getPendingPaymentCount(booth0, booth2);
                assert.strictEqual(info0[0], addressZero);
                assert.strictEqual(info0[1], booth0);
                assert.strictEqual(info0[2].toNumber(), 0);
                assert.strictEqual(info0[3].toNumber(), 0);
                assert.strictEqual(pendingCount01.toNumber(), 0);
                assert.strictEqual(pendingCount02.toNumber(), 0);
                const operatorBal = await web3.eth.getBalance(operator.address);
                const collected = await operator.getPayment(owner1);
                const vehicle0Due = await operator.getPayment(vehicle0);
                const vehicle0Bal = await web3.eth.getBalance(vehicle0);
                assert.strictEqual(operatorBal, ((deposit0 + extraDeposit) * multiplier0).toString());
                assert.strictEqual(collected.toNumber(), deposit0 * multiplier0);
                assert.strictEqual(vehicle0Due.toNumber(), extraDeposit * multiplier0);
                assert.strictEqual(vehicle0Bal, vehicleInitBal);
            });

            it("should be possible to report exit road on route with unknown price", async function() {
                this.test.b9Points = 0;
                this.test.b9MustPass = "failsCode";
                const result = await operator.reportExitRoad.call(secret0, { from: booth2 });
                assert.strictEqual(result.toNumber(), 2);
                const txObj = await operator.reportExitRoad(secret0, { from: booth2 });
                assert.strictEqual(txObj.receipt.logs.length, 1);
                assert.strictEqual(txObj.logs.length, 1);
                const logPending = txObj.logs[0];
                assert.strictEqual(logPending.event, "LogPendingPayment");
                assert.strictEqual(logPending.args.exitSecretHashed, hashed0);
                assert.strictEqual(logPending.args.entryBooth, booth0);
                assert.strictEqual(logPending.args.exitBooth, booth2);
                const info0 = await operator.getVehicleEntry(hashed0);
                const pendingCount01 = await operator.getPendingPaymentCount(booth0, booth1);
                const pendingCount02 = await operator.getPendingPaymentCount(booth0, booth2);
                assert.strictEqual(info0[0], vehicle0);
                assert.strictEqual(info0[1], booth0);
                assert.strictEqual(info0[2].toNumber(), multiplier0);
                assert.strictEqual(info0[3].toNumber(), (deposit0 + extraDeposit) * multiplier0);
                assert.strictEqual(pendingCount01.toNumber(), 0);
                assert.strictEqual(pendingCount02.toNumber(), 1);
                const operatorBal = await web3.eth.getBalance(operator.address);
                const collected = await operator.getPayment(owner1);
                const vehicle0Due = await operator.getPayment(vehicle0);
                const vehicle0Bal = await web3.eth.getBalance(vehicle0);
                assert.strictEqual(operatorBal, ((deposit0 + extraDeposit) * multiplier0).toString());
                assert.strictEqual(collected.toNumber(), 0);
                assert.strictEqual(vehicle0Due.toNumber(), 0);
                assert.strictEqual(vehicle0Bal, vehicleInitBal);
            });

        });

        describe("reportExitRoad with new multiplier", function() {

            const multiplier0b = multiplier0 + 1;
            let vehicleInitBal;

            beforeEach("should enter road with exact deposit and change multiplier and type", async function() {
                await operator.enterRoad(
                    booth0, hashed0, { from: vehicle0, value: deposit0 * multiplier0 });
                vehicleInitBal = await web3.eth.getBalance(vehicle0);
                await operator.setMultiplier(vehicleType0, multiplier0b, { from: owner1 });
                await regulator.setVehicleType(vehicle0, 0, { from: owner0 });
            });

            it("should be possible to report exit road on route with known price below deposited", async function() {
                this.test.b9Points = 0;
                this.test.b9MustPass = "failsCode";
                await operator.setRoutePrice(booth0, booth1, deposit0 - 1, { from: owner1 });
                const result = await operator.reportExitRoad.call(secret0, { from: booth1 });
                assert.strictEqual(result.toNumber(), 1);
                const txObj = await operator.reportExitRoad(secret0, { from: booth1 });
                assert.strictEqual(txObj.receipt.logs.length, 1);
                assert.strictEqual(txObj.logs.length, 1);
                const logExited = txObj.logs[0];
                assert.strictEqual(logExited.event, "LogRoadExited");
                assert.strictEqual(logExited.args.exitBooth, booth1);
                assert.strictEqual(logExited.args.exitSecretHashed, hashed0);
                assert.strictEqual(logExited.args.finalFee.toNumber(), (deposit0 - 1) * multiplier0);
                assert.strictEqual(logExited.args.refundWeis.toNumber(), multiplier0);
                const info0 = await operator.getVehicleEntry(hashed0);
                const pendingCount01 = await operator.getPendingPaymentCount(booth0, booth1);
                const pendingCount02 = await operator.getPendingPaymentCount(booth0, booth2);
                assert.strictEqual(info0[0], addressZero);
                assert.strictEqual(info0[1], booth0);
                assert.strictEqual(info0[2].toNumber(), 0);
                assert.strictEqual(info0[3].toNumber(), 0);
                assert.strictEqual(pendingCount01.toNumber(), 0);
                assert.strictEqual(pendingCount02.toNumber(), 0);
                const operatorBal = await web3.eth.getBalance(operator.address);
                const collected = await operator.getPayment(owner1);
                const vehicle0Due = await operator.getPayment(vehicle0);
                const vehicle0Bal = await web3.eth.getBalance(vehicle0);
                assert.strictEqual(operatorBal, (deposit0 * multiplier0).toString());
                assert.strictEqual(collected.toNumber(), (deposit0 - 1) * multiplier0);
                assert.strictEqual(vehicle0Due.toNumber(), multiplier0);
                assert.strictEqual(vehicle0Bal, vehicleInitBal);
            });

            it("should be possible to report exit road on route with unknown price", async function() {
                this.test.b9Points = 0;
                this.test.b9MustPass = "failsCode";
                const result = await operator.reportExitRoad.call(secret0, { from: booth2 });
                assert.strictEqual(result.toNumber(), 2);
                const txObj = await operator.reportExitRoad(secret0, { from: booth2 });
                assert.strictEqual(txObj.receipt.logs.length, 1);
                assert.strictEqual(txObj.logs.length, 1);
                const logPending = txObj.logs[0];
                assert.strictEqual(logPending.event, "LogPendingPayment");
                assert.strictEqual(logPending.args.exitSecretHashed, hashed0);
                assert.strictEqual(logPending.args.entryBooth, booth0);
                assert.strictEqual(logPending.args.exitBooth, booth2);
                const info0 = await operator.getVehicleEntry(hashed0);
                const pendingCount01 = await operator.getPendingPaymentCount(booth0, booth1);
                const pendingCount02 = await operator.getPendingPaymentCount(booth0, booth2);
                assert.strictEqual(info0[0], vehicle0);
                assert.strictEqual(info0[1], booth0);
                assert.strictEqual(info0[2].toNumber(), multiplier0);
                assert.strictEqual(info0[3].toNumber(), deposit0 * multiplier0);
                assert.strictEqual(pendingCount01.toNumber(), 0);
                assert.strictEqual(pendingCount02.toNumber(), 1);
                const operatorBal = await web3.eth.getBalance(operator.address);
                const collected = await operator.getPayment(owner1);
                const vehicle0Due = await operator.getPayment(vehicle0);
                const vehicle0Bal = await web3.eth.getBalance(vehicle0);
                assert.strictEqual(operatorBal, (deposit0 * multiplier0).toString());
                assert.strictEqual(collected.toNumber(), 0);
                assert.strictEqual(vehicle0Due.toNumber(), 0);
                assert.strictEqual(vehicle0Bal, vehicleInitBal);
            });

        });

        describe("Pending payments with vehicles on same route, then setRoutePrice", function() {

            const extraDeposit0 = deposit0 + randomIntIn(1, 1000);
            const extraDeposit1 = deposit0 + randomIntIn(1, 1000);
            let vehicle0InitBal, vehicle1InitBal;

            beforeEach("should have 2 vehicles enter and exit road on same unknown route", async function() {
                await operator.enterRoad(
                        booth0, hashed0, { from: vehicle0, value: extraDeposit0 * multiplier0 });
                await operator.enterRoad(
                        booth0, hashed1, { from: vehicle1, value: extraDeposit1 * multiplier1 });
                vehicle0InitBal = await web3.eth.getBalance(vehicle0);
                vehicle1InitBal = await web3.eth.getBalance(vehicle1);
                await operator.reportExitRoad(secret1, { from: booth2 });
                await operator.reportExitRoad(secret0, { from: booth2 });
            });

            it("should be possible to set the base route price below both deposits and reduce count by 1", async function() {
                this.test.b9Points = 0;
                this.test.b9MustPass = "failsCode";
                const success = await operator.setRoutePrice.call(booth0, booth2, deposit0, { from: owner1 });
                assert.isTrue(success);
                const txObj = await operator.setRoutePrice(booth0, booth2, deposit0, { from: owner1 });
                assert.strictEqual(txObj.receipt.logs.length, 2);
                assert.strictEqual(txObj.logs.length, 2);
                const logPriceSet = txObj.logs[0];
                assert.strictEqual(logPriceSet.event, "LogRoutePriceSet");
                assert.strictEqual(logPriceSet.args.sender, owner1);
                assert.strictEqual(logPriceSet.args.entryBooth, booth0);
                assert.strictEqual(logPriceSet.args.exitBooth, booth2);
                assert.strictEqual(logPriceSet.args.priceWeis.toNumber(), deposit0);
                const logExited = txObj.logs[1];
                assert.strictEqual(logExited.event, "LogRoadExited");
                assert.strictEqual(logExited.args.exitBooth, booth2);
                assert.strictEqual(logExited.args.exitSecretHashed, hashed1);
                assert.strictEqual(logExited.args.finalFee.toNumber(), deposit0 * multiplier1);
                assert.strictEqual(
                    logExited.args.refundWeis.toNumber(),
                    (extraDeposit1 - deposit0) * multiplier1);
                const info0 = await operator.getVehicleEntry(hashed0);
                const info1 = await operator.getVehicleEntry(hashed1);
                const pendingCount01 = await operator.getPendingPaymentCount(booth0, booth1);
                const pendingCount02 = await operator.getPendingPaymentCount(booth0, booth2);
                assert.strictEqual(info0[0], vehicle0);
                assert.strictEqual(info0[1], booth0);
                assert.strictEqual(info0[2].toNumber(), multiplier0);
                assert.strictEqual(info0[3].toNumber(), extraDeposit0 * multiplier0);
                assert.strictEqual(info1[0], addressZero);
                assert.strictEqual(info1[1], booth0);
                assert.strictEqual(info1[2].toNumber(), 0);
                assert.strictEqual(info1[3].toNumber(), 0);
                assert.strictEqual(pendingCount01.toNumber(), 0);
                assert.strictEqual(pendingCount02.toNumber(), 1);
                const operatorBal = await web3.eth.getBalance(operator.address);
                const collected = await operator.getPayment(owner1);
                const vehicle0Due = await operator.getPayment(vehicle0);
                const vehicle1Due = await operator.getPayment(vehicle1);
                const vehicle0Bal = await web3.eth.getBalance(vehicle0);
                const vehicle1Bal = await web3.eth.getBalance(vehicle1);
                assert.strictEqual(
                    operatorBal,
                    (extraDeposit0 * multiplier0 + extraDeposit1 * multiplier1).toString());
                assert.strictEqual(collected.toNumber(), deposit0 * multiplier1);
                assert.strictEqual(vehicle0Due.toNumber(), 0);
                assert.strictEqual(vehicle1Due.toNumber(), (extraDeposit1 - deposit0) * multiplier1);
                assert.strictEqual(vehicle0Bal, vehicle0InitBal);
                assert.strictEqual(vehicle1Bal, vehicle1InitBal);
            });

            it("should be possible to set the base route price above both deposits and reduce count by 1", async function() {
                this.test.b9Points = 0;
                this.test.b9MustPass = "failsCode";
                const success = await operator.setRoutePrice.call(booth0, booth2, extraDeposit0 + extraDeposit1, { from: owner1 });
                assert.isTrue(success);
                const txObj = await operator.setRoutePrice(booth0, booth2, extraDeposit0 + extraDeposit1, { from: owner1 });
                assert.strictEqual(txObj.receipt.logs.length, 2);
                assert.strictEqual(txObj.logs.length, 2);
                const logPriceSet = txObj.logs[0];
                assert.strictEqual(logPriceSet.event, "LogRoutePriceSet");
                assert.strictEqual(logPriceSet.args.sender, owner1);
                assert.strictEqual(logPriceSet.args.entryBooth, booth0);
                assert.strictEqual(logPriceSet.args.exitBooth, booth2);
                assert.strictEqual(logPriceSet.args.priceWeis.toNumber(), extraDeposit0 + extraDeposit1);
                const logExited = txObj.logs[1];
                assert.strictEqual(logExited.event, "LogRoadExited");
                assert.strictEqual(logExited.args.exitBooth, booth2);
                assert.strictEqual(logExited.args.exitSecretHashed, hashed1);
                assert.strictEqual(logExited.args.finalFee.toNumber(), extraDeposit1 * multiplier1);
                assert.strictEqual(logExited.args.refundWeis.toNumber(), 0);
                const info0 = await operator.getVehicleEntry(hashed0);
                const info1 = await operator.getVehicleEntry(hashed1);
                const pendingCount01 = await operator.getPendingPaymentCount(booth0, booth1);
                const pendingCount02 = await operator.getPendingPaymentCount(booth0, booth2);
                assert.strictEqual(info0[0], vehicle0);
                assert.strictEqual(info0[1], booth0);
                assert.strictEqual(info0[2].toNumber(), multiplier0);
                assert.strictEqual(info0[3].toNumber(), extraDeposit0 * multiplier0);
                assert.strictEqual(info1[0], addressZero);
                assert.strictEqual(info1[1], booth0);
                assert.strictEqual(info1[2].toNumber(), 0);
                assert.strictEqual(info1[3].toNumber(), 0);
                assert.strictEqual(pendingCount01.toNumber(), 0);
                assert.strictEqual(pendingCount02.toNumber(), 1);
                const operatorBal = await web3.eth.getBalance(operator.address);
                const collected = await operator.getPayment(owner1);
                const vehicle0Due = await operator.getPayment(vehicle0);
                const vehicle1Due = await operator.getPayment(vehicle1);
                const vehicle0Bal = await web3.eth.getBalance(vehicle0);
                const vehicle1Bal = await web3.eth.getBalance(vehicle1);
                assert.strictEqual(
                    operatorBal,
                    (extraDeposit0 * multiplier0 + extraDeposit1 * multiplier1).toString());
                assert.strictEqual(collected.toNumber(), extraDeposit1 * multiplier1);
                assert.strictEqual(vehicle0Due.toNumber(), 0);
                assert.strictEqual(vehicle1Due.toNumber(), 0);
                assert.strictEqual(vehicle0Bal, vehicle0InitBal);
                assert.strictEqual(vehicle1Bal, vehicle1InitBal);
            });

            describe("Clear one more pending payment", function() {

                it("should be possible to set the base route price below both deposits then clear the second by hand", async function() {
                    this.test.b9Points = 0;
                    this.test.b9MustPass = "failsCode";
                    await operator.setRoutePrice(booth0, booth2, deposit0, { from: owner1 });
                    const success = await operator.clearSomePendingPayments.call(booth0, booth2, 1, { from: owner0 });
                    assert.isTrue(success);
                    const txObj = await operator.clearSomePendingPayments(booth0, booth2, 1, { from: owner0 });
                    assert.strictEqual(txObj.receipt.logs.length, 1);
                    assert.strictEqual(txObj.logs.length, 1);
                    const logExited = txObj.logs[0];
                    assert.strictEqual(logExited.event, "LogRoadExited");
                    assert.strictEqual(logExited.args.exitBooth, booth2);
                    assert.strictEqual(logExited.args.exitSecretHashed, hashed0);
                    assert.strictEqual(logExited.args.finalFee.toNumber(), deposit0 * multiplier0);
                    assert.strictEqual(
                        logExited.args.refundWeis.toNumber(),
                        (extraDeposit0 - deposit0) * multiplier0);
                    const info0 = await operator.getVehicleEntry(hashed0);
                    const info1 = await operator.getVehicleEntry(hashed1);
                    const pendingCount01 = await operator.getPendingPaymentCount(booth0, booth1);
                    const pendingCount02 = await operator.getPendingPaymentCount(booth0, booth2);
                    assert.strictEqual(info0[0], addressZero);
                    assert.strictEqual(info0[1], booth0);
                    assert.strictEqual(info0[2].toNumber(), 0);
                    assert.strictEqual(info0[3].toNumber(), 0);
                    assert.strictEqual(info1[0], addressZero);
                    assert.strictEqual(info1[1], booth0);
                    assert.strictEqual(info1[2].toNumber(), 0);
                    assert.strictEqual(info1[3].toNumber(), 0);
                    assert.strictEqual(pendingCount01.toNumber(), 0);
                    assert.strictEqual(pendingCount02.toNumber(), 0);
                    const operatorBal = await web3.eth.getBalance(operator.address);
                    const collected = await operator.getPayment(owner1);
                    const vehicle0Due = await operator.getPayment(vehicle0);
                    const vehicle1Due = await operator.getPayment(vehicle1);
                    const vehicle0Bal = await web3.eth.getBalance(vehicle0);
                    const vehicle1Bal = await web3.eth.getBalance(vehicle1);
                    assert.strictEqual(
                        operatorBal,
                        (extraDeposit0 * multiplier0 + extraDeposit1 * multiplier1).toString());
                    assert.strictEqual(collected.toNumber(), deposit0 * (multiplier0 + multiplier1));
                    assert.strictEqual(vehicle0Due.toNumber(), (extraDeposit0 - deposit0) * multiplier0);
                    assert.strictEqual(vehicle1Due.toNumber(), (extraDeposit1 - deposit0) * multiplier1);
                    assert.strictEqual(vehicle0Bal, vehicle0InitBal);
                    assert.strictEqual(vehicle1Bal, vehicle1InitBal);
                });

            });

        });

        describe("Withdraw from 2 vehicles", function() {

            const gasPrice = randomIntIn(1, 1000);
            let owner1InitBal;

            beforeEach("should enter 2 vehicles", async function() {
                await operator.enterRoad(booth0, hashed0, { from: vehicle0, value: deposit0 * multiplier0 });
                await operator.enterRoad(booth0, hashed1, { from: vehicle1, value: deposit0 * multiplier1 });
                owner1InitBal = await web3.eth.getBalance(owner1);
            });

            it("should be possible to withdraw if second vehicle has exited", async function() {
                this.test.b9Points = 0;
                this.test.b9MustPass = "failsCode";
                await operator.reportExitRoad(secret1, { from: booth1 });
                const txObj = await operator.withdrawPayment({ from: owner1, gasPrice: gasPrice });
                assert.strictEqual(txObj.receipt.logs.length, 1);
                assert.strictEqual(txObj.logs.length, 1);
                const logFeesCollected = txObj.logs[0];
                assert.strictEqual(logFeesCollected.event, "LogPaymentWithdrawn");
                assert.strictEqual(logFeesCollected.args.toWhom, owner1);
                assert.strictEqual(logFeesCollected.args.amount.toNumber(), price01 * multiplier1);
                const operatorBal = await web3.eth.getBalance(operator.address);
                const collected = await operator.getPayment(owner1);
                const owner1Bal = await web3.eth.getBalance(owner1);
                const vehicle0Due = await operator.getPayment(vehicle0);
                const vehicle1Due = await operator.getPayment(vehicle1);
                assert.strictEqual(
                    operatorBal,
                    (deposit0 * multiplier0 + (deposit0 - price01) * multiplier1).toString());
                assert.strictEqual(collected.toNumber(), 0);
                assert.strictEqual(
                    owner1Bal,
                    toBN(owner1InitBal).add(toBN(price01 * multiplier1)).sub(toBN(txObj.receipt.gasUsed * gasPrice)).toString(10));
                assert.strictEqual(vehicle0Due.toNumber(), 0);
                assert.strictEqual(vehicle1Due.toNumber(), (deposit0 - price01) * multiplier1);
            });

        });

        describe("Scalability", function() {

            const count = 45; // Multiple of 15, but at least a 45

            it("should cost proportional gas to clear pending 1 by 1, 2 by 2 or 3 by 3", async function() {
                this.test.b9Points = 0; // But for real, a lot.
                // Prime storage
                const hashedB0 = await operator.hashSecret(padLeft(99, 64));
                await operator.enterRoad(booth0, hashedB0, { from: vehicle0, value: deposit0 * multiplier0 });
                await operator.reportExitRoad(padLeft(99, 64), { from: booth1 });

                const txObjs1 = [];
                for (let i = 1; i <= count + 1; i++) { // 1 more than count
                    const hashedI = await operator.hashSecret(padLeft(100 + i, 64));
                    txObjs1.push(await operator.enterRoad(booth0, hashedI, { from: vehicle0, value: deposit0 * multiplier0 }));
                }

                const txObjs2 = [];
                for (let i = 1; i <= count + 1; i++) { // 1 more than count
                    txObjs2.push(await operator.reportExitRoad(padLeft(100 + i, 64), { from: booth2 }));
                }
                await operator.setRoutePrice(booth0, booth2, 100, { from: owner1 }); // clears 1
                
                const txObjsBy3 = [];
                const txObjsBy5 = [];
                const txObjsBy7 = [];
                for (let i = 1; i <= count / 15; i++) {
                    txObjsBy3.push(await operator.clearSomePendingPayments(booth0, booth2, 3, { from: booth0 }));
                    txObjsBy5.push(await operator.clearSomePendingPayments(booth0, booth2, 5, { from: booth1 }));
                    txObjsBy7.push(await operator.clearSomePendingPayments(booth0, booth2, 7, { from: booth1 }));
                }
                const expectedGasUsed3 = txObjsBy3[0].receipt.gasUsed;
                const expectedGasUsed5 = txObjsBy5[0].receipt.gasUsed;
                const expectedGasUsed7 = txObjsBy7[0].receipt.gasUsed;
                let latestDiff;
                for (let i = 0; i < count / 15; i++) {
                    const gasUsed3 = txObjsBy3[i].receipt.gasUsed;
                    const gasUsed5 = txObjsBy5[i].receipt.gasUsed;
                    const gasUsed7 = txObjsBy7[i].receipt.gasUsed;
                    const diff2a = gasUsed5 - gasUsed3;
                    const diff2b = gasUsed7 - gasUsed5;
                    assert.isAtLeast(diff2a, diff2b - 100);
                    assert.isAtMost(diff2a, diff2b + 100);
                    latestDiff = diff2a;
                }
                console.log("Single 2-incremental clear pending gas cost", latestDiff);
            });

        });

    });

    it("should have correct number of functions", async function() {
        this.test.b9Points = 0;
        this.test.b9MustPass = "failsCode";
        const instance = await TollBoothOperator.new(true, deposit1, owner0, { from: owner0 });
        assert.strictEqual(Object.keys(instance).length, 45);
        // ['constructor','abi','methods','contract','removeTollBooth','setOwner','setPaused','addTollBooth',
        // 'setMultiplier','getPayment','getRoutePrice','isTollBooth','getOwner','getMultiplier','isPaused',
        // 'getDeposit','setRegulator','setDeposit','getRegulator','LogRoadEntered','LogRoadExited',
        // 'LogPendingPayment','LogPaymentWithdrawn','LogRegulatorSet','LogRoutePriceSet','LogMultiplierSet',
        // 'LogTollBoothAdded','LogTollBoothRemoved','LogDepositSet','LogPausedSet','LogOwnerSet',
        // 'hashSecret','enterRoad','getVehicleEntry','reportExitRoad','getPendingPaymentCount','setRoutePrice',
        // 'clearSomePendingPayments','withdrawPayment','sendTransaction','send','allEvents','getPastEvents',
        // 'address','transactionHash']
    });

});
