import file from '../fs.js'
import {performance} from 'perf_hooks'
import run from '../../cherub/index.js'

const
dirTmp=['read.txt'],
readTxt='some text',
mkOpts=function()
{
	return {
		cleanup:async function()
		{
			return
		}
	}
},
tests=
[
	[()=>file.readDir('tmp'),dirTmp,'readDir'],
	[()=>file.readFile('tmp/read.txt'),readTxt,'readFile']
],
//@todo re-enable shuffle
opts={now:()=>performance.now(),parallel:false,shuffle:false}

run(tests,opts)
