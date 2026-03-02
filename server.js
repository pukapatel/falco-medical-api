require('dotenv').config();
const express = require('express');
const neo4j = require('neo4j-driver');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Neo4j Driver Setup
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(
    process.env.NEO4J_USER,
    process.env.NEO4J_PASSWORD
  )
);

// Root Route
app.get('/', (req, res) => {
  res.send('FALCO Medical API Running');
});

// SEARCH ROUTE
app.get('/search', async (req, res) => {
  const searchTerm = req.query.q;

  if (!searchTerm) {
    return res.status(400).json({ error: 'Search term required' });
  }

  const session = driver.session({ database: 'neo4j' });

  try {
    const result = await session.run(
      `
      MATCH (b:BodyPart)-[:HAS_CONDITION]->(c:Condition)
      WHERE toLower(b.name) CONTAINS toLower($searchTerm)
         OR toLower(c.name) CONTAINS toLower($searchTerm)
      RETURN b.name AS bodyPart, c.name AS condition
      LIMIT 25
      `,
      { searchTerm }
    );

    const records = result.records.map(record => ({
      bodyPart: record.get('bodyPart'),
      condition: record.get('condition')
    }));

    res.json(records);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  } finally {
    await session.close();
  }
});

// TEST DATABASE ROUTE
app.get('/test-db', async (req, res) => {
  const session = driver.session({ database: 'neo4j' });

  try {
    const result = await session.run(
      `RETURN "Database Connected" AS message`
    );

    res.json(result.records[0].get('message'));

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// Start Server
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
