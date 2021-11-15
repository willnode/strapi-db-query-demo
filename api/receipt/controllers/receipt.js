'use strict';
const { sanitizeEntity } = require("strapi-utils/lib");
module.exports = {
    async transferBalance(ctx) {
        // Read from POST body
        const { amount, from, to } = ctx.request.body;
        return await strapi.connections.default.transaction(async (transacting) => {
            // Find the user
            const fromUser = await strapi.query('user', 'users-permissions').findOne({ id: from }, null, { transacting });
            const toUser = await strapi.query('user', 'users-permissions').findOne({ id: to }, null, { transacting });
            // Check if the user exists
            if (!fromUser || !toUser) {
                return ctx.badRequest(null, 'User not found');
            }
            // Check if the user has enough balance
            if (fromUser.balance < amount) {
                return ctx.badRequest(null, 'Insufficient balance');
            }
            // Update the user balance
            fromUser.balance -= amount;
            toUser.balance += amount;
            // Record the transaction
            let receipt = await strapi.query('receipt').create({
                sender: fromUser.id,
                recipient: toUser.id,
                amount,
            }, { transacting });
            // Save the user
            await strapi.query('user', 'users-permissions').update({ id: from }, fromUser, { transacting });
            await strapi.query('user', 'users-permissions').update({ id: to }, toUser, { transacting });
            // respond with the receipt (don't forget to sanitize our output!)
            return sanitizeEntity(receipt, { model: strapi.models.receipt });
        });
    },

    async transferBalanceNoTransaction(ctx) {
        // Read from POST body
        const { amount, from, to } = ctx.request.body;
        // Find the user
        const fromUser = await strapi.query('user', 'users-permissions').findOne({ id: from }, null);
        const toUser = await strapi.query('user', 'users-permissions').findOne({ id: to }, null);
        // Check if the user has enough balance
        if (fromUser.balance < amount) {
            return ctx.badRequest(null, 'Insufficient balance');
        }
        // Save the user data
        await strapi.query('user', 'users-permissions').update({ id: from }, { balance: fromUser.balance -= amount });
        await strapi.query('user', 'users-permissions').update({ id: to }, { balance: toUser.balance += amount });
        // Record the transaction
        let receipt = await strapi.query('receipt').create({
            sender: fromUser.id,
            recipient: toUser.id,
            amount,
        });
        // respond with the receipt (don't forget to sanitize our output!)
        return sanitizeEntity(receipt, { model: strapi.models.receipt });
    }
};
