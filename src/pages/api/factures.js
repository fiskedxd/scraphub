import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  console.log('API appelée');
  
  try {
    const facturesDir = path.join(process.cwd(), 'public', 'factures');
    console.log('Dossier factures:', facturesDir);
    
    const lots = ['lot 1', 'lot 2', 'lot 3'];
    const allFactures = [];

    for (const lot of lots) {
      const lotPath = path.join(facturesDir, lot);
      console.log('Vérification dossier:', lotPath);
      
      if (!fs.existsSync(lotPath)) {
        console.log(`Dossier non trouvé: ${lotPath}`);
        continue;
      }

      const files = fs.readdirSync(lotPath);
      console.log(`Fichiers dans ${lot}:`, files);
      
      for (const file of files) {
        if (file.toLowerCase().endsWith('.pdf')) {
          const filePath = path.join(lotPath, file);
          const stats = fs.statSync(filePath);
          
          allFactures.push({
            id: `${lot}-${file}`,
            nom: file,
            lot: lot,
            chemin: `/factures/${encodeURIComponent(lot)}/${encodeURIComponent(file)}`,
            taille: stats.size,
            date: stats.mtime
          });
        }
      }
    }

    console.log('Total factures trouvées:', allFactures.length);
    res.status(200).json(allFactures);
  } catch (error) {
    console.error('Erreur API:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
}