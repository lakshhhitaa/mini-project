const express = require('express');
const { pool } = require('../config/database');

const router = express.Router();

const isAuthenticated = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

router.get('/', isAuthenticated, async (req, res) => {
    try {
        const [expenses] = await pool.execute(
            'SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC',
            [req.session.userId]
        );
        res.json(expenses);
    } catch (error) {
        console.error('Get expenses error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/', isAuthenticated, async (req, res) => {
    try {
        const { amount, category, description, date } = req.body;

        if (!amount || !category || !date) {
            return res.status(400).json({ error: 'Amount, category, and date are required' });
        }

        const [result] = await pool.execute(
            'INSERT INTO expenses (user_id, amount, category, description, date) VALUES (?, ?, ?, ?, ?)',
            [req.session.userId, amount, category, description, date]
        );

        res.json({ 
            message: 'Expense added successfully',
            expense: { id: result.insertId, amount, category, description, date }
        });
    } catch (error) {
        console.error('Add expense error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, category, description, date } = req.body;

        if (!amount || !category || !date) {
            return res.status(400).json({ error: 'Amount, category, and date are required' });
        }

        const [result] = await pool.execute(
            'UPDATE expenses SET amount = ?, category = ?, description = ?, date = ? WHERE id = ? AND user_id = ?',
            [amount, category, description, date, id, req.session.userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        res.json({ message: 'Expense updated successfully' });
    } catch (error) {
        console.error('Update expense error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.execute(
            'DELETE FROM expenses WHERE id = ? AND user_id = ?',
            [id, req.session.userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
        console.error('Delete expense error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/summary', isAuthenticated, async (req, res) => {
    try {
        const [totalResult] = await pool.execute(
            'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ?',
            [req.session.userId]
        );

        const [monthlyResult] = await pool.execute(
            'SELECT COALESCE(SUM(amount), 0) as monthly FROM expenses WHERE user_id = ? AND MONTH(date) = MONTH(CURRENT_DATE()) AND YEAR(date) = YEAR(CURRENT_DATE())',
            [req.session.userId]
        );

        const [countResult] = await pool.execute(
            'SELECT COUNT(*) as count FROM expenses WHERE user_id = ?',
            [req.session.userId]
        );

        const [categoryResult] = await pool.execute(
            'SELECT category, SUM(amount) as amount FROM expenses WHERE user_id = ? GROUP BY category',
            [req.session.userId]
        );

        res.json({
            total: totalResult[0].total,
            monthly: monthlyResult[0].monthly,
            count: countResult[0].count,
            categories: categoryResult
        });
    } catch (error) {
        console.error('Get summary error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
