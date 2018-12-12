import file from '../fs.js'
import {performance} from 'perf_hooks'
import run from '../../cherub/index.js'

const
dirTmp=['read.txt'],
readTxt='some text',
emptyDir=src=>file.readDir(src).then(x=>Array.isArray(x)&&!x.length),
curry=(fn,...xs)=>(...ys)=>fn(...xs,...ys),
tests=
[
	[()=>file.readDir('tmp'),dirTmp,'readDir'],
	[()=>file.readFile('tmp/read.txt'),readTxt,'readFile'],
	[
		()=>file.writeDir('tmp/a'),
		()=>emptyDir('tmp/a/'),
		{name:'writeDir',cleanup:curry(file.delete,'tmp/a/')}
	],
	[
		()=>file.writeFile('tmp/write.txt','test text'),
		()=>file.readFile('tmp/write.txt').then(txt=>txt==='test text'),
		{name:'writeFile',cleanup:curry(file.delete,'tmp/write.txt')}
	],
	[
		curry(file.deleteDir,'tmp/a/'),
		()=>file.readDir('tmp').then(val=>run.config.assert(val,dirTmp)),
		{//@todo add a backup delete on cleanup?
			name:'deleteFile',
			setup:()=>file.writeDir('tmp/a')
		}
	]
],
opts={now:()=>performance.now(),parallel:false}

run(tests,opts)
