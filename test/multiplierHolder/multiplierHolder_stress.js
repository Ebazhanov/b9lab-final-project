/* global web3 assert artifacts contract describe before beforeEach it */

const fs = require("fs");
const path = require('path');
const metaInfoSaver = require("../../utils/metaInfoSaver.js")(fs);

const allArtifacts = {
    MultiplierHolder: artifacts.require("./MultiplierHolder.sol"),
    TollBoothOperator: artifacts.require("./TollBoothOperator.sol")
};

const constructors = {
    MultiplierHolder: (owner, paused) => allArtifacts.MultiplierHolder.new({ from: owner }),
    TollBoothOperator: (owner, paused) => allArtifacts.TollBoothOperator.new(paused, 1, owner, { from: owner })
};

contract("MultiplierHolder - stress", function(accounts) {

    let owner0;

    before("should prepare", async function() {
        assert.isAtLeast(accounts.length, 1);
        owner0 = accounts[0];
        const balance = await web3.eth.getBalance(owner0);
        assert.isAtLeast(parseInt(web3.utils.fromWei(balance)), 10);
    });

    after("should save meta info", function() {
        const dirNameElements = __dirname.split(path.sep);
        const dirName = dirNameElements[dirNameElements.length - 1];
        metaInfoSaver(
            this.test.parent,
            __dirname + "/../../result/" + dirName,
            path.basename(__filename) + ".points.json");
    });

    Object.keys(constructors).forEach(name => {

        describe(name, function() {

            let holder;

            beforeEach("should deploy a new un-paused " + name, async function() {
                holder = await constructors[name](owner0, false);
            });

            const count = 15;

            it("should cost the same gas to set multiplier on successive types", async function() {
                this.test.b9Points = 3;
                this.test.b9MustPass = "failsCode";
                const txObjs = [];
                // We start at 31 just in case the student mistakenly set values in the constructor in the low
                // vehicle types
                for (let i = 31; i <= 30 + count; i++) {
                    txObjs.push(await holder.setMultiplier.sendTransaction(i, 2 * i, { from: owner0 }));
                }
                const expectedGasUsed = txObjs[0].receipt.gasUsed;
                for (let i = 1; i <= count - 1; i++) {
                    assert.strictEqual(txObjs[i].receipt.gasUsed, expectedGasUsed);
                }
            });

            it("should cost the same gas to unset multiplier on successive types", async function() {
                this.test.b9Points = 5;
                this.test.b9MustPass = "failsCode";
                for (let i = 1; i <= count; i++) {
                    await holder.setMultiplier.sendTransaction(i, 2 * i, { from: owner0 });
                }
                const txObjs = [];
                for (let i = 1; i <= count; i++) {
                    txObjs.push(await holder.setMultiplier.sendTransaction(i, 0, { from: owner0 }));
                }
                const expectedGasUsed = txObjs[0].receipt.gasUsed;
                for (let i = 1; i <= count - 1; i++) {
                    assert.strictEqual(txObjs[i].receipt.gasUsed, expectedGasUsed);
                }
            });

        });

    });

});
