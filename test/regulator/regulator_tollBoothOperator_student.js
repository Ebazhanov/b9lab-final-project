/* global web3 assert artifacts contract describe before beforeEach it */

const fs = require("fs");
const path = require('path');
const metaInfoSaver = require("../../utils/metaInfoSaver.js")(fs);

const Regulator = artifacts.require("./Regulator.sol");
const TollBoothOperator = artifacts.require("./TollBoothOperator.sol");
const { fromWei, isAddress, padLeft } = web3.utils;

contract("Regulator, Toll Booth Operator", function(accounts) {

    let owner0, owner1, owner2, regulator;
    const addressZero = padLeft(0, 40);
    const deposit0 = Math.floor(Math.random() * 1000) + 1;

    before("should prepare", async function() {
        assert.isAtLeast(accounts.length, 3);
        [ owner0, owner1, owner2 ] = accounts;
        const balance = await web3.eth.getBalance(owner0);
        assert.isAtLeast(parseInt(fromWei(balance)), 10);
    });

    after("should save meta info", async function() {
        const dirNameElements = __dirname.split(path.sep);
        const dirName = dirNameElements[dirNameElements.length - 1];
        metaInfoSaver(
            this.test.parent,
            __dirname + "/../../result/" + dirName,
            path.basename(__filename) + ".points.json");
    });

    beforeEach("should deploy a new Regulator", async function() {
        regulator = await Regulator.new({ from: owner0 });
    });

    describe("isOperator", function() {

        it("should have correct initial value", async function() {
            this.test.b9Points = 0;
            this.test.b9MustPass = "failsCode";
            assert.isFalse(await regulator.isOperator(regulator.address));
            assert.isFalse(await regulator.isOperator(owner0));
            assert.isFalse(await regulator.isOperator(owner1));
            assert.isFalse(await regulator.isOperator(addressZero));
        });

    });

    describe("createNewOperator", function() {

        it("should be possible to create an operator and return an address", async function() {
            this.test.b9Points = 0;
            this.test.b9MustPass = "failsCode";
            assert.isTrue(isAddress(await regulator.createNewOperator.call(owner1, deposit0, { from: owner0 })));
        });

        it("should be possible to create an operator and emit events", async function() {
            this.test.b9Points = 0;
            this.test.b9MustPass = "failsCode";
            const txObj = await regulator.createNewOperator(owner1, deposit0, { from: owner0 });

            assert.strictEqual(txObj.receipt.logs.length, 3);
            assert.strictEqual(txObj.logs.length, 3);
            const logCreated = txObj.logs[1];
            assert.strictEqual(logCreated.event, "LogTollBoothOperatorCreated");
            assert.strictEqual(logCreated.args.sender, owner0);
            const operator = logCreated.args.newOperator;
            assert.strictEqual(logCreated.args.owner, owner1);
            assert.strictEqual(logCreated.args.depositWeis.toNumber(), deposit0);
            
            const logChangedOwner = txObj.logs[2];
            assert.strictEqual(logChangedOwner.event, "LogOwnerSet");
            assert.strictEqual(logChangedOwner.address, operator);
            assert.strictEqual(logChangedOwner.args.previousOwner, regulator.address);
            assert.strictEqual(logChangedOwner.args.newOwner, owner1);
        });

        it("should be possible to create an operator and record it", async function() {
            this.test.b9Points = 0;
            this.test.b9MustPass = "failsCode";
            const txObj = await regulator.createNewOperator(owner1, deposit0, { from: owner0 });
            const operator = txObj.logs[1].args.newOperator;
            assert.isTrue(await regulator.isOperator(operator));
        });

        it("should be possible to create an operator with proper values", async function() {
            this.test.b9Points = 0;
            this.test.b9MustPass = "failsCode";
            const txObj = await regulator.createNewOperator(owner1, deposit0, { from: owner0 });
            const operator = await TollBoothOperator.at(txObj.logs[1].args.newOperator);
            assert.strictEqual(await operator.getOwner(), owner1);
            assert.strictEqual((await operator.getDeposit()).toNumber(), deposit0);
            assert.strictEqual(await operator.getRegulator(), regulator.address);
        });

    });

    describe("removeOperator", function() {

        let operator;

        beforeEach("should create an operator", async function() {
            const txObj = await regulator.createNewOperator(owner1, deposit0, { from: owner0 });
            operator = await TollBoothOperator.at(txObj.logs[1].args.newOperator);
        });

        it("should be possible to remove an operator and return true", async function() {
            this.test.b9Points = 0;
            this.test.b9MustPass = "failsCode";
            assert.isTrue(await regulator.removeOperator.call(operator.address, { from: owner0 }));
        });

        it("should be possible to remove an operator and emit event", async function() {
            this.test.b9Points = 0;
            this.test.b9MustPass = "failsCode";
            const txObj = await regulator.removeOperator(operator.address, { from: owner0 });
            assert.strictEqual(txObj.receipt.logs.length, 1);
            assert.strictEqual(txObj.logs.length, 1);
            const logRemoved = txObj.logs[0];
            assert.strictEqual(logRemoved.event, "LogTollBoothOperatorRemoved");
            assert.strictEqual(logRemoved.args.sender, owner0);
            assert.strictEqual(logRemoved.args.operator, operator.address);
        });

        it("should be possible to remove an operator and record it", async function() {
            this.test.b9Points = 0;
            this.test.b9MustPass = "failsCode";
            await regulator.removeOperator(operator.address, { from: owner0 });
            assert.isFalse(await regulator.isOperator(operator.address));
        });

        it("should be possible to remove an operator and let it live alone", async function() {
            this.test.b9Points = 0;
            this.test.b9MustPass = "failsCode";
            await regulator.removeOperator(operator.address, { from: owner0 });
            assert.strictEqual(await operator.getOwner(), owner1);
            assert.strictEqual((await operator.getDeposit()).toNumber(), deposit0);
            assert.strictEqual(await operator.getRegulator(), regulator.address);
        });

    });

});
