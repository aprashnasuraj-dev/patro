import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {runInNewContext} from 'node:vm';import {spawnSync} from 'node:child_process';import {mkdtemp,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
test('real SQLite migration accepts preexisting weights and rollup reads avoid double counting',async()=>{const dir=await mkdtemp(join(tmpdir(),'patro-rollup-'));const file=join(dir,'db.sqlite');const execute=(sql,params=[])=>{const r=spawnSync('python',['-c',`import sqlite3,json,sys\nc=sqlite3.connect(sys.argv[1]);c.row_factory=sqlite3.Row\ns,p=json.loads(sys.stdin.read());r=c.execute(s,p);o=[dict(x) for x in r.fetchall()];c.commit();print(json.dumps(o))`,file],{input:JSON.stringify([sql,params]),encoding:'utf8'});if(r.status)throw Error(r.stderr);return JSON.parse(r.stdout);};const db={prepare(sql){let params=[];return {bind(...p){params=p;return this},async all(){return {results:execute(sql,params)}},async run(){execute(sql,params);return{}},async first(){return execute(sql,params)[0]||null},get data(){return [sql,params]}}},async batch(stmts){return stmts.map(s=>execute(...s.data));}};try{execute('create table aap_pageviews(id integer primary key,ts integer,path text,visitor text,country text,device text,browser text,referrer text,weight real not null default 1)');execute('insert into aap_pageviews(id,ts,path,visitor,country,device,browser,referrer) values(1,0,\'/\',\'old\',NULL,\'desktop\',\'Chrome\',NULL)');const migration=await readFile('cloudflare/d1/schema-migrations/0006_weighted_analytics_rollup.sql','utf8');for(const sql of migration.split(';').filter(s=>s.trim()))execute(sql);assert.equal(execute('select weight from aap_pageviews')[0].weight,1);execute('delete from aap_pageviews');const day=Date.now()-3*86400000;for(let i=0;i<6;i++)execute('insert into aap_pageviews(ts,path,visitor,country,device,browser,referrer,weight) values(?,?,?,?,?,?,?,?)',[day+i*86400000/3,i%2?'/date':'/','day'+Math.floor(i/3)+'v'+i,'NP','mobile','Chrome',null,10]);const bundle=await build({entryPoints:['worker/admin-console/analytics-rollup.ts'],bundle:true,write:false,format:'cjs',platform:'node'});const ctx={module:{exports:{}},Date,console};runInNewContext(bundle.outputFiles[0].text,ctx);const m=ctx.module.exports;await m.rollupPageviews({DB:db});const before=await m.rolledStats({DB:db},'total',Date.now()-5*86400000);assert.equal(before.reduce((s,r)=>s+r.views,0),60);await m.rollupPageviews({DB:db});assert.equal((await m.rolledStats({DB:db},'total',Date.now()-5*86400000)).reduce((s,r)=>s+r.views,0),60);execute("delete from aap_pageviews where date(ts/1000,'unixepoch','+345 minutes') in(select day from aap_pageview_rollup_days)");assert.equal((await m.rolledStats({DB:db},'total',Date.now()-5*86400000)).reduce((s,r)=>s+r.views,0),60);}finally{await rm(dir,{recursive:true,force:true});}});


test('migration-compatibility: bootstrapped and legacy D1 pageviews both retain rows and gain rollup tables', async () => {
  const migration = await readFile('cloudflare/d1/schema-migrations/0006_weighted_analytics_rollup.sql', 'utf8');
  assert.doesNotMatch(migration, /alter\s+table\s+aap_pageviews\s+add\s+column\s+weight/i,
    'migrations cannot unconditionally add a column created by the live D1 bootstrap');
  const bundle = await build({
    entryPoints: ['worker/admin-console/db.ts'], bundle: true,
    write: false, format: 'cjs', platform: 'node'
  });
  for (const scenario of ['legacy', 'bootstrapped']) {
    const dir = await mkdtemp(join(tmpdir(), 'patro-d1-migration-'));
    const file = join(dir, 'db.sqlite');
    const execute = (sql, params = []) => {
      const runner = [
        'import sqlite3,json,sys',
        'conn=sqlite3.connect(sys.argv[1])',
        'conn.row_factory=sqlite3.Row',
        'sql,params=json.loads(sys.stdin.read())',
        'rows=[dict(row) for row in conn.execute(sql,params).fetchall()]',
        'conn.commit()',
        'print(json.dumps(rows))'
      ].join('\n');
      const result = spawnSync('python', ['-c', runner, file], {
        input: JSON.stringify([sql, params]), encoding: 'utf8'
      });
      if (result.status !== 0) throw new Error(scenario + ' SQLite query failed: ' + result.stderr + '\n' + sql);
      return JSON.parse(result.stdout);
    };
    try {
      const column = scenario === 'bootstrapped' ? ',weight real not null default 1' : '';
      execute('create table aap_pageviews(id integer primary key,ts integer,path text,visitor text,country text,device text,browser text,referrer text' + column + ')');
      execute("insert into aap_pageviews(id,ts,path,visitor,country,device,browser,referrer) values(1,0,'/','old',NULL,'desktop','Chrome',NULL)");
      if (scenario === 'bootstrapped') execute('update aap_pageviews set weight=9 where id=1');
      const applyMigration = () => {
        for (const statement of migration.split(';').filter(part => part.trim())) execute(statement);
      };
      applyMigration();
      const before = execute('pragma table_info(aap_pageviews)').map(row => row.name);
      assert.equal(before.includes('weight'), scenario === 'bootstrapped',
        scenario + ': migration itself must not duplicate or force a column');
      const DB = {
        prepare(sql) {
          let params = [];
          return {
            bind(...args) { params = args; return this; },
            get data() { return [sql, params]; },
            async all() { return { results: execute(sql, params) }; },
            async first() { return execute(sql, params)[0] ?? null; },
            async run() { execute(sql, params); return {}; }
          };
        },
        async batch(statements) { return statements.map(stmt => execute(...stmt.data)); }
      };
      // Evaluate a fresh copy per database to avoid production module's
      // isolate-wide schemaReady memo crossing independent fixtures.
      const context = { module: { exports: {} }, console, Date };
      runInNewContext(bundle.outputFiles[0].text, context);
      await context.module.exports.ensureSchema({ DB });
      await context.module.exports.ensureSchema({ DB });
      applyMigration(); // replay must remain idempotent
      const values = execute('select weight from aap_pageviews where id=1');
      assert.equal(values[0].weight, scenario === 'bootstrapped' ? 9 : 1);
      for (const table of ['aap_pageview_daily', 'aap_pageview_rollup_days']) {
        assert.equal(execute('select name from sqlite_master where type=? and name=?',
          ['table', table]).length, 1, scenario + ': missing ' + table);
      }
      assert.equal(execute('select count(*) as n from aap_pageviews')[0].n, 1,
        scenario + ': migration must not delete pageviews');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
});
