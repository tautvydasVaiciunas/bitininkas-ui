#!/bin/sh
set -e

echo "==> Boot: running migrations"
node -e 'const fs=require("fs");function pick(){const c=["./dist/ormdatasource.js","./dist/src/ormdatasource.js","./dist/typeorm.config.js","./dist/src/typeorm.config.js"];for(const p of c){ if(fs.existsSync(p)) return p;} throw new Error("No compiled DataSource file found");}const p=pick();console.log("Using DataSource at",p);const mod=require(p);const ds=mod.AppDataSource||mod.dataSource||mod.default;if(!ds) throw new Error("No DataSource export");ds.initialize().then(()=>ds.runMigrations()).then(()=>{console.log("Migrations done");process.exit(0)}).catch(e=>{console.error(e);process.exit(1)});'

echo "==> Boot: seeding (best-effort)"
node -e 'const fs=require("fs"); const p=fs.existsSync("./dist/src/seeds/seed.js")?"./dist/src/seeds/seed.js":(fs.existsSync("./dist/seeds/seed.js")?"./dist/seeds/seed.js":null); if(!p){console.log("No compiled seed file found, skipping"); process.exit(0);} console.log("Running seed",p); require(p); console.log("Seed finished OK");' || echo "Seed failed, continuing..."

echo "==> Boot: starting API"
exec node dist/src/main.js
