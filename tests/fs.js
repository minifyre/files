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
		{
			name:'deleteDir',
			setup:()=>file.writeDir('tmp/a')
		}
	],
	[
		curry(file.deleteFile,'tmp/write.txt'),
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
	]
	// @todo lib.copyDir (copy tmp into itself)
	// lib.copyFile
	// lib.info (on dir and a file)'

	// lib.moveDir
	// lib.moveFile
	// lib.renameFile
	// lib.renameDir

	// lib.writeDirs tmp/a/b/c/
	// copy,delete,move,read,rename (on both dir & file, or update prev tests to use these methods instead)

],
opts={now:()=>performance.now(),parallel:false}


run(tests,opts)