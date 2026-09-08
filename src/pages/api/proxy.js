
export default async function handler(req, res) {
  
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const response = await fetch('https://brixhub.net/api/v1/search', {
    method: 'POST',
    headers: {
      'X-API-Key': 'brix_7I_VfE4_FCxJJAjfcB_pufsKQj1h67I8ngTYXTbVD9P6PsiE',
      'User-Agent': 'BrixHubProxy/1.0',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(req.body)
  });

  const data = await response.json();
  res.status(response.status).json(data);
}