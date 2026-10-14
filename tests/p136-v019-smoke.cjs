#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const js=fs.readFileSync('assets/v019.js','utf8');
const html=fs.readFileSync('index.html','utf8');
for(const id of ['nodePanel','nodeStatus','nodeList','nodeFullNetwork','river','source','map'])assert.match(html,new RegExp('id="'+id+'"'));
for(const fragment of ['function addCandidateOutlet(features)','function focusUpstreamNode(id)','upstream_ids','children.get(String(dn)).push','nodeFullNetwork'])assert.ok(js.includes(fragment),fragment);
assert.match(html,/assets\/v019\.js\?v=0\.019/);
for(const name of ['tamsui','lanyang']){
 const dir=name==='tamsui'?'data/published/':'data/candidates/lanyang/';
 const prefix=name==='tamsui'?'tamsui-network-':'network-';
 const manifest=JSON.parse(fs.readFileSync(dir+prefix+'manifest.json','utf8'));
 const validation=JSON.parse(fs.readFileSync(dir+prefix+'validation.json','utf8'));
 assert.equal(manifest.feature_count,validation.feature_count);
 assert.equal(manifest.published_sha256,validation.output_sha256);
 assert.equal(manifest.basin_boundary_verified,false);
}
console.log('P136 V0.019 candidate node UI and two river manifests: PASS');
