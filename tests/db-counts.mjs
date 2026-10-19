import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('data/aarogya.sqlite');
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map((r) => r.name);
console.log('tables          :', tables.join(', '));
console.log('patients        :', db.prepare('SELECT count(*) AS n FROM patients').get().n);
console.log('symptom_logs   :', db.prepare('SELECT count(*) AS n FROM symptom_logs').get().n);
console.log('prescriptions  :', db.prepare('SELECT count(*) AS n FROM prescriptions').get().n);
db.close();
