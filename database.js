const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../data/database.json');

const initDatabase = () => {
    const dataDir = path.dirname(DB_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            users: [],
            expenses: [],
            wishlist: [],
            necessities: []
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    }
};

const readDatabase = () => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading database:', error);
        return { users: [], expenses: [], wishlist: [], necessities: [] };
    }
};

const writeDatabase = (data) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing database:', error);
        return false;
    }
};

const pool = {
    execute: async (query, params = []) => {
        const data = readDatabase();
        
        if (query.includes('INSERT INTO users')) {
            const newUser = {
                id: data.users.length + 1,
                username: params[0],
                email: params[1],
                password: params[2],
                created_at: new Date().toISOString()
            };
            data.users.push(newUser);
            writeDatabase(data);
            return [{ insertId: newUser.id }];
        }
        
        if (query.includes('SELECT') && query.includes('users')) {
            if (query.includes('username = ? OR email = ?')) {
                const users = data.users.filter(u => u.username === params[0] || u.email === params[1]);
                return [users];
            }
            if (query.includes('username = ?')) {
                const users = data.users.filter(u => u.username === params[0]);
                return [users];
            }
        }
        
        if (query.includes('INSERT INTO expenses')) {
            const newExpense = {
                id: data.expenses.length + 1,
                user_id: params[0],
                amount: params[1],
                category: params[2],
                description: params[3],
                date: params[4],
                created_at: new Date().toISOString()
            };
            data.expenses.push(newExpense);
            writeDatabase(data);
            return [{ insertId: newExpense.id }];
        }
        
        if (query.includes('SELECT') && query.includes('expenses')) {
            let expenses = data.expenses;
            
            if (query.includes('user_id = ?')) {
                expenses = expenses.filter(e => e.user_id === params[0]);
            }
            
            if (query.includes('ORDER BY date DESC')) {
                expenses = expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
            }
            
            return [expenses];
        }
        
        if (query.includes('UPDATE expenses')) {
            const expenseIndex = data.expenses.findIndex(e => e.id === params[4] && e.user_id === params[5]);
            if (expenseIndex !== -1) {
                data.expenses[expenseIndex] = {
                    ...data.expenses[expenseIndex],
                    amount: params[0],
                    category: params[1],
                    description: params[2],
                    date: params[3]
                };
                writeDatabase(data);
                return [{ affectedRows: 1 }];
            }
            return [{ affectedRows: 0 }];
        }
        
        if (query.includes('DELETE FROM expenses')) {
            const initialLength = data.expenses.length;
            data.expenses = data.expenses.filter(e => e.id === params[0] && e.user_id === params[1]);
            const affectedRows = initialLength - data.expenses.length;
            writeDatabase(data);
            return [{ affectedRows }];
        }
        
        if (query.includes('SUM(amount)')) {
            let expenses = data.expenses;
            
            if (query.includes('user_id = ?')) {
                expenses = expenses.filter(e => e.user_id === params[0]);
            }
            
            if (query.includes('MONTH(date) = MONTH(CURRENT_DATE)')) {
                const currentMonth = new Date().getMonth() + 1;
                expenses = expenses.filter(e => new Date(e.date).getMonth() + 1 === currentMonth);
            }
            
            if (query.includes('DATE(date) = CURDATE()')) {
                const today = new Date().toISOString().split('T')[0];
                expenses = expenses.filter(e => e.date === today);
            }
            
            const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
            return [{ total }];
        }
        
        if (query.includes('COUNT(*)')) {
            let expenses = data.expenses;
            
            if (query.includes('user_id = ?')) {
                expenses = expenses.filter(e => e.user_id === params[0]);
            }
            
            if (query.includes('DATE(date) = CURDATE()')) {
                const today = new Date().toISOString().split('T')[0];
                expenses = expenses.filter(e => e.date === today);
            }
            
            return [{ count: expenses.length }];
        }
        
        if (query.includes('GROUP BY category')) {
            let expenses = data.expenses;
            
            if (query.includes('user_id = ?')) {
                expenses = expenses.filter(e => e.user_id === params[0]);
            }
            
            const categoryData = {};
            expenses.forEach(e => {
                if (!categoryData[e.category]) {
                    categoryData[e.category] = 0;
                }
                categoryData[e.category] += parseFloat(e.amount);
            });
            
            const result = Object.entries(categoryData).map(([category, amount]) => ({
                category,
                amount
            }));
            
            return [result];
        }
        
        return [[]];
    }
};

module.exports = { pool, initDatabase };
