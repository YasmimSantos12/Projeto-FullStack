import 'dotenv/config';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { readDatabase, updateDatabase } from './database.js';

const app = express();
const port = Number(process.env.PORT) || 3333;
const jwtSecret = process.env.JWT_SECRET || 'development-only-secret-change-before-deploy';

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

function authenticate(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Faça login para continuar.' });
  }

  try {
    const payload = jwt.verify(authorization.slice(7), jwtSecret);
    req.userId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ message: 'Sessão inválida ou expirada.' });
  }
}

function validDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function validateMeal(body) {
  const { name, description, dateTime, isOnDiet } = body ?? {};
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
    return 'O nome é obrigatório e deve ter até 100 caracteres.';
  }
  if (typeof description !== 'string' || !description.trim() || description.trim().length > 1000) {
    return 'A descrição é obrigatória e deve ter até 1000 caracteres.';
  }
  if (!validDate(dateTime)) return 'Informe uma data e hora válidas.';
  if (typeof isOnDiet !== 'boolean') return 'Informe se a refeição está dentro da dieta.';
  return null;
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/users', async (req, res, next) => {
  try {
    const { name, email, password } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) {
      return res.status(400).json({ message: 'Informe um nome com até 80 caracteres.' });
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: 'Informe um e-mail válido.' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = {
      id: randomUUID(),
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 10),
      createdAt: new Date().toISOString()
    };
    const created = await updateDatabase((database) => {
      if (database.users.some((item) => item.email === normalizedEmail)) return false;
      database.users.push(user);
      return true;
    });
    if (!created) return res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
    return res.status(201).json({ id: user.id, name: user.name, email: user.email });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/sessions', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Informe e-mail e senha.' });
    }
    const database = await readDatabase();
    const user = database.users.find((item) => item.email === email.trim().toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'E-mail ou senha incorretos.' });
    }
    const token = jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: '7d' });
    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/me', authenticate, async (req, res, next) => {
  try {
    const database = await readDatabase();
    const user = database.users.find((item) => item.id === req.userId);
    if (!user) return res.status(401).json({ message: 'Usuário não encontrado.' });
    return res.json({ id: user.id, name: user.name, email: user.email });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/meals', authenticate, async (req, res, next) => {
  try {
    const database = await readDatabase();
    const meals = database.meals
      .filter((meal) => meal.userId === req.userId)
      .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
    return res.json(meals);
  } catch (error) {
    return next(error);
  }
});

app.post('/api/meals', authenticate, async (req, res, next) => {
  try {
    const validationError = validateMeal(req.body);
    if (validationError) return res.status(400).json({ message: validationError });

    const meal = {
      id: randomUUID(),
      userId: req.userId,
      name: req.body.name.trim(),
      description: req.body.description.trim(),
      dateTime: new Date(req.body.dateTime).toISOString(),
      isOnDiet: req.body.isOnDiet,
      createdAt: new Date().toISOString()
    };
    await updateDatabase((database) => database.meals.push(meal));
    return res.status(201).json(meal);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/meals/:id', authenticate, async (req, res, next) => {
  try {
    const database = await readDatabase();
    const meal = database.meals.find((item) => item.id === req.params.id && item.userId === req.userId);
    if (!meal) return res.status(404).json({ message: 'Refeição não encontrada.' });
    return res.json(meal);
  } catch (error) {
    return next(error);
  }
});

app.put('/api/meals/:id', authenticate, async (req, res, next) => {
  try {
    const validationError = validateMeal(req.body);
    if (validationError) return res.status(400).json({ message: validationError });

    const updatedMeal = await updateDatabase((database) => {
      const index = database.meals.findIndex((item) => item.id === req.params.id && item.userId === req.userId);
      if (index === -1) return null;
      database.meals[index] = {
        ...database.meals[index],
        name: req.body.name.trim(),
        description: req.body.description.trim(),
        dateTime: new Date(req.body.dateTime).toISOString(),
        isOnDiet: req.body.isOnDiet,
        updatedAt: new Date().toISOString()
      };
      return database.meals[index];
    });
    if (!updatedMeal) return res.status(404).json({ message: 'Refeição não encontrada.' });
    return res.json(updatedMeal);
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/meals/:id', authenticate, async (req, res, next) => {
  try {
    const deleted = await updateDatabase((database) => {
      const index = database.meals.findIndex((item) => item.id === req.params.id && item.userId === req.userId);
      if (index === -1) return false;
      database.meals.splice(index, 1);
      return true;
    });
    if (!deleted) return res.status(404).json({ message: 'Refeição não encontrada.' });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

app.get('/api/metrics', authenticate, async (req, res, next) => {
  try {
    const database = await readDatabase();
    const meals = database.meals
      .filter((meal) => meal.userId === req.userId)
      .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    let bestSequence = 0;
    let currentSequence = 0;
    for (const meal of meals) {
      currentSequence = meal.isOnDiet ? currentSequence + 1 : 0;
      bestSequence = Math.max(bestSequence, currentSequence);
    }
    const withinDiet = meals.filter((meal) => meal.isOnDiet).length;
    return res.json({
      totalMeals: meals.length,
      mealsWithinDiet: withinDiet,
      mealsOutsideDiet: meals.length - withinDiet,
      bestOnDietSequence: bestSequence
    });
  } catch (error) {
    return next(error);
  }
});

app.use((_req, res) => res.status(404).json({ message: 'Rota não encontrada.' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  return res.status(500).json({ message: 'Erro interno do servidor.' });
});

app.listen(port, () => console.log(`Daily Diet API disponível em http://localhost:${port}`));
