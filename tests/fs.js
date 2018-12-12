import file from '../fs.js'
import {performance} from 'perf_hooks'
import run from '../../cherub/index.js'

const
dirTmp=['read.txt'],
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
],
opts={now:()=>performance.now(),parallel:false}

run(tests,opts)
