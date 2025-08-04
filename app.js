// app.js
const express = require('express');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// In-memory storage for todos
let todos = [];

// View engine
app.set('view engine', 'ejs');

// Routes
app.get('/', (req, res) => {
    res.render('index', { todos });
});

app.post('/add', (req, res) => {
    const newTodo = req.body.task;
    if (newTodo) {
        todos.push({ task: newTodo, completed: false });
    }
    res.redirect('/');
});

app.post('/complete/:index', (req, res) => {
    const index = req.params.index;
    if (todos[index]) {
        todos[index].completed = true;
    }
    res.redirect('/');
});

app.post('/delete/:index', (req, res) => {
    const index = req.params.index;
    if (todos[index]) {
        todos.splice(index, 1);
    }
    res.redirect('/');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
