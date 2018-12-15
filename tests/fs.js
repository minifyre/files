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
	[()=>file.read('tmp'),dirTmp,'readDir'],
	[()=>file.read('tmp/read.txt'),readTxt,'readFile'],
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
		curry(file.delete,'tmp/a/'),
		()=>file.readDir('tmp').then(val=>run.config.assert(val,dirTmp)),
		{
			name:'deleteDir',
			setup:()=>file.writeDir('tmp/a')
		}
	],
	[
		curry(file.delete,'tmp/write.txt'),
		()=>file.readDir('tmp').then(val=>run.config.assert(val,dirTmp)),
		{
			name:'deleteFile',
			setup:()=>file.writeFile('tmp/write.txt','test text')
		}
	],
	[
		curry(file.isDir,'tmp'),
		true,
		'folder isDir=true'
	],
	[
		curry(file.isDir,'tmp/read.txt'),
		false,
		'file isDir=false'
	],
	[
		curry(file.writeDirs,'tmp/a/b/c'),
		()=>file.isDir('tmp/a/b/c/'),
		{
			name:'writeDirs',
			cleanup:curry(file.deleteDir,'tmp/a/')
		}
	],
	[
		curry(file.rename,'tmp/read.txt','copy.txt'),
		()=>file.read('tmp/copy.txt').then(txt=>txt===readTxt),
		{
			name:'renameFile',
			cleanup:curry(file.rename,'tmp/copy.txt','read.txt')
		}
	],
	[

		curry(file.moveFile,'tmp/read.txt','tmp/a/'),
		()=>file.readFile('tmp/a/read.txt').then(txt=>txt===readTxt),
		{
			name:'moveFile',
			setup:()=>file.writeDir('tmp/a/'),
			cleanup:async function()
			{
				await file.delete('tmp/a')
				await file.writeFile('tmp/read.txt',readTxt)
			}
		}
	]

	// @todo lib.copyDir (copy tmp into itself)
	// lib.copyFile
	// lib.info (on dir and a file)'

	// lib.moveDir
	// lib.renameDir

	//these are used with move functions...
	// copy,move,rename (on both dir & file, or update prev tests to use these methods instead)

],
opts={now:()=>performance.now(),parallel:false}

run(tests,opts)