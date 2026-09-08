
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, exactMatch, limit = 1000 } = req.body;

  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Query required' });
  }

  try {
    const dbPath = path.join(process.cwd(), 'public', 'fts_index.sqlite');
    
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    const searchTerms = query.split(' ').filter(t => t.trim());
    
    let sqlQuery = '';
    let params = [];

    if (exactMatch) {
      sqlQuery = `
        SELECT *, 
          rank 
        FROM fts_index 
        WHERE content LIKE ? 
        ORDER BY rank 
        LIMIT ?
      `;
      params = [`%${query}%`, limit];
    } else {
      const conditions = searchTerms.map(() => `content LIKE ?`).join(' OR ');
      sqlQuery = `
        SELECT *, 
          rank 
        FROM fts_index 
        WHERE ${conditions}
        ORDER BY rank 
        LIMIT ?
      `;
      params = [...searchTerms.map(t => `%${t}%`), limit];
    }

    const results = await db.all(sqlQuery, params);
    
    await db.close();

    const formattedResults = results.map(row => ({
      ...row,
      source: row.source || 'fts_database',
      date: row.date || new Date().toISOString().split('T')[0]
    }));

    res.status(200).json({
      success: true,
      total: formattedResults.length,
      results: formattedResults
    });
  } catch (error) {
    console.error('SQLite search error:', error);
    res.status(500).json({ 
      error: 'Database error',
      details: error.message 
    });
  }
}