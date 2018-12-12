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
		{name:'writeDir',cleanup:curry(file.deleteDir,'tmp/a/')}
	]
],
//@todo re-enable shuffle
opts={now:()=>performance.now(),parallel:false,shuffle:false}

run(tests,opts)
