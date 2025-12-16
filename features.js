const express = require('express');
const { pool } = require('../config/database');

const router = express.Router();

const isAuthenticated = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

// Wishlist routes
router.get('/wishlist', isAuthenticated, async (req, res) => {
    try {
        const data = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../../data/database.json'), 'utf8'));
        const wishlist = data.wishlist.filter(item => item.user_id === req.session.userId);
        res.json(wishlist);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/wishlist', isAuthenticated, async (req, res) => {
    try {
        const { item, price, category, priority } = req.body;
        const data = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../../data/database.json'), 'utf8'));
        
        const newWishItem = {
            id: data.wishlist.length + 1,
            user_id: req.session.userId,
            item,
            price: parseFloat(price),
            category,
            priority,
            created_at: new Date().toISOString()
        };
        
        data.wishlist.push(newWishItem);
        require('fs').writeFileSync(require('path').join(__dirname, '../../data/database.json'), JSON.stringify(data, null, 2));
        
        res.json({ message: 'Item added to wishlist', item: newWishItem });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/wishlist/:id', isAuthenticated, async (req, res) => {
    try {
        const data = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../../data/database.json'), 'utf8'));
        const initialLength = data.wishlist.length;
        data.wishlist = data.wishlist.filter(item => !(item.id === parseInt(req.params.id) && item.user_id === req.session.userId));
        
        if (data.wishlist.length < initialLength) {
            require('fs').writeFileSync(require('path').join(__dirname, '../../data/database.json'), JSON.stringify(data, null, 2));
            res.json({ message: 'Item removed from wishlist' });
        } else {
            res.status(404).json({ error: 'Item not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Necessities routes
router.get('/necessities', isAuthenticated, async (req, res) => {
    try {
        const data = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../../data/database.json'), 'utf8'));
        const necessities = data.necessities.filter(item => item.user_id === req.session.userId);
        res.json(necessities);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/necessities', isAuthenticated, async (req, res) => {
    try {
        const { item, amount, frequency, category } = req.body;
        const data = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../../data/database.json'), 'utf8'));
        
        const newNecessity = {
            id: data.necessities.length + 1,
            user_id: req.session.userId,
            item,
            amount: parseFloat(amount),
            frequency,
            category,
            created_at: new Date().toISOString()
        };
        
        data.necessities.push(newNecessity);
        require('fs').writeFileSync(require('path').join(__dirname, '../../data/database.json'), JSON.stringify(data, null, 2));
        
        res.json({ message: 'Necessity added', item: newNecessity });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/necessities/:id', isAuthenticated, async (req, res) => {
    try {
        const data = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../../data/database.json'), 'utf8'));
        const initialLength = data.necessities.length;
        data.necessities = data.necessities.filter(item => !(item.id === parseInt(req.params.id) && item.user_id === req.session.userId));
        
        if (data.necessities.length < initialLength) {
            require('fs').writeFileSync(require('path').join(__dirname, '../../data/database.json'), JSON.stringify(data, null, 2));
            res.json({ message: 'Necessity removed' });
        } else {
            res.status(404).json({ error: 'Necessity not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Daily expenses
router.get('/daily', isAuthenticated, async (req, res) => {
    try {
        const [expenses] = await pool.execute(
            'SELECT * FROM expenses WHERE user_id = ? AND DATE(date) = CURDATE() ORDER BY created_at DESC',
            [req.session.userId]
        );
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/daily/summary', isAuthenticated, async (req, res) => {
    try {
        const [totalResult] = await pool.execute(
            'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ? AND DATE(date) = CURDATE()',
            [req.session.userId]
        );
        
        const [countResult] = await pool.execute(
            'SELECT COUNT(*) as count FROM expenses WHERE user_id = ? AND DATE(date) = CURDATE()',
            [req.session.userId]
        );
        
        res.json({
            total: totalResult[0].total,
            count: countResult[0].count
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
