const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { BigNumber } = require("bignumber.js");

describe("Stake", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployToken() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("BEP20Ethereum");
    const token = await Token.deploy();

    return { token, owner, otherAccount };
  }

  async function deployStake() {
    // Contracts are deployed using the first signer/account by default
    const [owner, firstAccount, secondAccount] = await ethers.getSigners();
    const { token } = await loadFixture(deployToken);

    const Stake = await ethers.getContractFactory("VetMeStaking");
    const totalForStake = BigNumber(5000).times(1e18).toString(10);

    const stake = await Stake.deploy(token, token, totalForStake);

    return { stake, owner, firstAccount, secondAccount, token };
  }

  describe("Deployment Token", function () {
    it("Should return the correct total supply", async function () {
      const { token, owner } = await loadFixture(deployToken);
      const expectedTotalSupply = BigNumber(500000000).times(1e18).toString(10);
      expect(await token.totalSupply()).to.equal(expectedTotalSupply);
    });
  });

  describe("Deployment Stake", function () {
    it("Should return the correct staking token", async function () {
      const { stake, owner, token } = await loadFixture(deployStake);
      expect(await stake.stakingToken()).to.equal(token.target);
    });
  });

  describe("Stake", function () {
    const user1Stake = BigNumber(500).times(1e18).toString(10);
    const user2Stake = BigNumber(200).times(1e18).toString(10);
    it("Should revert errors if Zoro", async function () {
      const { stake, owner, token } = await loadFixture(deployStake);
      await expect(stake.stake(0)).to.be.revertedWith("Amount = 0");
    });

    it("Should revert errors if Not Started", async function () {
      const { stake, owner, token } = await loadFixture(deployStake);
      await expect(stake.stake(user1Stake)).to.be.revertedWith(
        "Staking not started"
      );
    });

    it("Should revert errors if Not Started", async function () {
      const { stake, owner, token } = await loadFixture(deployStake);
      await expect(stake.stake(user1Stake)).to.be.revertedWith(
        "Staking not started"
      );
    });

    it("Should Revert If Staking Ended", async function () {
      const { stake, owner, token, firstAccount } = await loadFixture(
        deployStake
      );
      await token.transfer(
        firstAccount,
        BigNumber(2000).times(1e18).toString(10)
      );
      await token
        .connect(firstAccount)
        .approve(stake.target, BigNumber(5000).times(1e18).toString(10));

      await stake.setRewardsDuration(300);

      await time.increase(7200);

      await expect(
        stake.connect(firstAccount).stake(user1Stake)
      ).to.be.revertedWith("Staking period has ended");
    });

    it("Should Stake", async function () {
      const { stake, owner, token, firstAccount } = await loadFixture(
        deployStake
      );
      await token.transfer(
        firstAccount,
        BigNumber(2000).times(1e18).toString(10)
      );
      await token
        .connect(firstAccount)
        .approve(stake.target, BigNumber(5000).times(1e18).toString(10));

      await stake.setRewardsDuration(300);
      await stake.connect(firstAccount).stake(user1Stake);

      await expect(await token.balanceOf(firstAccount.address)).to.equal(
        BigNumber(1500).times(1e18).toString(10)
      );

      await expect(await stake.balanceOf(firstAccount.address)).to.equal(
        BigNumber(500).times(1e18).toString(10)
      );

      await expect(await stake.totalSupply()).to.equal(
        BigNumber(500).times(1e18).toString(10)
      );
    });
  });

  describe("Request Withdraw", function () {
    const user1Stake = BigNumber(500).times(1e18).toString(10);

    it("Should Revert If Has Zero Staking", async function () {
      const { stake, owner, token, firstAccount } = await loadFixture(
        deployStake
      );

      await stake.setRewardsDuration(300);

      await expect(
        stake.connect(firstAccount).requestWithdraw()
      ).to.be.revertedWith("You have no stake");
    });

    it("Should Revert If Has Zero Staking", async function () {
      const { stake, owner, token, firstAccount } = await loadFixture(
        deployStake
      );

      await stake.setRewardsDuration(300);

      await expect(
        stake.connect(firstAccount).requestWithdraw()
      ).to.be.revertedWith("You have no stake");
    });

    it("Should Request Withdraw", async function () {
      const { stake, owner, token, firstAccount } = await loadFixture(
        deployStake
      );

      await token.transfer(
        firstAccount,
        BigNumber(2000).times(1e18).toString(10)
      );
      await token
        .connect(firstAccount)
        .approve(stake.target, BigNumber(5000).times(1e18).toString(10));

      await stake.setRewardsDuration(300);
      await stake.connect(firstAccount).stake(user1Stake);

      await stake.connect(firstAccount).requestWithdraw();

      await expect(
        await stake.connect(firstAccount).withdraw_pending(firstAccount.address)
      ).to.greaterThan(0);
    });
  });

  describe("Withdraw", function () {
    const user1Stake = BigNumber(500).times(1e18).toString(10);
    it("Should Revet When Not Staked or not have pending request", async function () {
      const { stake, owner, token, firstAccount } = await loadFixture(
        deployStake
      );

      await token.transfer(
        firstAccount,
        BigNumber(2000).times(1e18).toString(10)
      );
      await token
        .connect(firstAccount)
        .approve(stake.target, BigNumber(5000).times(1e18).toString(10));

      await stake.setRewardsDuration(300);
      await expect(stake.connect(firstAccount).withdraw()).to.be.revertedWith(
        "You have no stake"
      );
      await stake.connect(firstAccount).stake(user1Stake);
      await expect(stake.connect(firstAccount).withdraw()).to.be.revertedWith(
        "You have no pending withdraw"
      );
    });

    it("Should Revert When Waiting time still pending", async function () {
      const { stake, owner, token, firstAccount } = await loadFixture(
        deployStake
      );

      await token.transfer(
        firstAccount,
        BigNumber(2000).times(1e18).toString(10)
      );
      await token
        .connect(firstAccount)
        .approve(stake.target, BigNumber(5000).times(1e18).toString(10));

      await stake.setRewardsDuration(300);
      await stake.connect(firstAccount).stake(user1Stake);

      await stake.connect(firstAccount).requestWithdraw();

      await expect(stake.connect(firstAccount).withdraw()).to.be.revertedWith(
        "Withdraw pending."
      );
    });

    it("Should Widthdraw", async function () {
      const { stake, owner, token, firstAccount } = await loadFixture(
        deployStake
      );

      await token.transfer(
        firstAccount,
        BigNumber(2000).times(1e18).toString(10)
      );
      await token
        .connect(firstAccount)
        .approve(stake.target, BigNumber(5000).times(1e18).toString(10));

      await stake.setRewardsDuration(300);
      await stake.connect(firstAccount).stake(user1Stake);

      await stake.connect(firstAccount).requestWithdraw();

      await time.increase(172800);
      await stake.connect(firstAccount).withdraw();

      await expect(
        await token.connect(firstAccount).balanceOf(firstAccount.address)
      ).to.equal(BigNumber(2000).times(1e18).toString(10));
      await expect(await stake.connect(firstAccount).totalSupply()).to.equal(0);
    });
  });

  describe("Claim Reward", function () {
    const user1Stake = BigNumber(500).times(1e18).toString(10);
    it("Should Revet When Not Staked", async function () {
      const { stake, owner, token, firstAccount } = await loadFixture(
        deployStake
      );

      await token.transfer(
        firstAccount,
        BigNumber(2000).times(1e18).toString(10)
      );
      await token
        .connect(firstAccount)
        .approve(stake.target, BigNumber(5000).times(1e18).toString(10));

      await stake.setRewardsDuration(300);
      await expect(stake.connect(firstAccount).withdraw()).to.be.revertedWith(
        "You have no stake"
      );
    });

    it("Should Revert When Staking Period Is Not Over", async function () {
      const { stake, owner, token, firstAccount } = await loadFixture(
        deployStake
      );
      await token.transfer(
        stake.target,
        BigNumber(5000).times(1e18).toString(10)
      );

      await token.transfer(
        firstAccount,
        BigNumber(2000).times(1e18).toString(10)
      );

      await token
        .connect(firstAccount)
        .approve(stake.target, BigNumber(5000).times(1e18).toString(10));

      await stake.setRewardsDuration(300);
      await stake.connect(firstAccount).stake(user1Stake);

      await expect(
        stake.connect(firstAccount).claimReward()
      ).to.be.revertedWith("Staking period is not over");
    });

    it("Should Revert When Already cliamed", async function () {
      const { stake, owner, token, firstAccount } = await loadFixture(
        deployStake
      );

      await token.transfer(
        stake.target,
        BigNumber(5000).times(1e18).toString(10)
      );

      await token.transfer(
        firstAccount,
        BigNumber(2000).times(1e18).toString(10)
      );

      await token.approve(
        stake.target,
        BigNumber(5000).times(1e18).toString(10)
      );
      await stake.notifyRewardAmount(BigNumber(2000).times(1e18).toString(10));


      await token
        .connect(firstAccount)
        .approve(stake.target, BigNumber(5000).times(1e18).toString(10));

      await stake.setRewardsDuration(300);
      await stake.connect(firstAccount).stake(user1Stake);

      await time.increase(172800);

      await stake.connect(firstAccount).claimReward();

      await expect(
        stake.connect(firstAccount).claimReward()
      ).to.be.revertedWith("Reward has been claimed");
    });

    it("Should Claim", async function () {
      const { stake, owner, token, firstAccount } = await loadFixture(
        deployStake
      );

      await token.transfer(
        stake.target,
        BigNumber(2000).times(1e18).toString(10)
      );

      await token.approve(
        stake.target,
        BigNumber(5000).times(1e18).toString(10)
      );
      await stake.notifyRewardAmount(BigNumber(2000).times(1e18).toString(10));

      await token.transfer(
        firstAccount,
        BigNumber(5000).times(1e18).toString(10)
      );

      await token
        .connect(firstAccount)
        .approve(stake.target, BigNumber(5000).times(1e18).toString(10));

      await stake.setRewardsDuration(300);
      await stake.connect(firstAccount).stake(user1Stake);

      await time.increase(172800);
      await stake.connect(firstAccount).claimReward();

      await expect(await token.balanceOf(firstAccount.address)).to.equal(
        BigNumber(5200).times(1e18).toString(10)
      );
    });
  });
});

// We use lock.connect() to send a transaction from another account
// await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
//   "You aren't the owner"
// );
