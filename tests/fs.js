import file from '../fs.js'
import {performance} from 'perf_hooks'
import run from '../../cherub/index.js'

const
dirTmp=['read.txt'],
readPath='tmp/read.txt',
readTxt='some text',
aPath='tmp/a',
writePath='tmp/write.txt',
//utils
emptyDir=src=>file.readDir(src).then(x=>Array.isArray(x)&&!x.length),
curry=(fn,...xs)=>(...ys)=>fn(...xs,...ys),
txtMatches=txt=>txt===readTxt,
//test stuff
cleanup=()=>file.delete('tmp'),
setup=()=>file.writeDir('tmp').then(()=>file.writeFile(readPath,readTxt)),
tests=
[
	[()=>file.read('tmp'),dirTmp,'readDir'],
	[()=>file.read(readPath),readTxt,'readFile'],
	[
		()=>file.writeDir(aPath),
		()=>emptyDir(aPath),
		{name:'writeDir',cleanup:curry(file.delete,aPath)}
	],
	[
		()=>file.writeFile(writePath,readTxt),
		()=>file.readFile(writePath).then(txtMatches),
		{name:'writeFile',cleanup:curry(file.delete,writePath)}
	],
	[
		curry(file.delete,aPath),
		()=>file.readDir('tmp').then(val=>run.config.assert(val,dirTmp)),
		{
			name:'deleteDir',
			setup:()=>file.writeDir(aPath)
		}
	],
	[
		curry(file.delete,writePath),
		()=>file.readDir('tmp').then(val=>run.config.assert(val,dirTmp)),
		{
			name:'deleteFile',
			setup:()=>file.writeFile(writePath,readTxt)
		}
	],
	[
		curry(file.isDir,'tmp'),
		true,
		'folder isDir=true'
	],
	[
		curry(file.isDir,readPath),
		false,
		'file isDir=false'
	],
	[
		curry(file.writeDirs,'tmp/a/b/c'),
		()=>file.isDir('tmp/a/b/c/'),
		{
			name:'writeDirs',
			cleanup:curry(file.deleteDir,aPath)
		}
	],
	[
		curry(file.move,readPath,aPath),
		()=>file.readFile('tmp/a/read.txt').then(txtMatches),
		{
			name:'moveFile',
			setup:()=>file.writeDir(aPath),
			cleanup:async function()
			{
				await file.delete(aPath)
				await file.writeFile(readPath,readTxt)
			}
		}
	],
	[
		curry(file.move,'tmp','tmpNew'),
		()=>file.readFile('tmpNew/tmp/read.txt').then(txtMatches),
		{
			name:'moveDir',
			cleanup:()=>file.delete('tmpNew').then(setup),
			setup:()=>file.writeDir('tmpNew')
		}
	],
	[
		curry(file.rename,readPath,'copy.txt'),
		()=>file.read('tmp/copy.txt').then(txtMatches),
		{
			name:'renameFile',
			cleanup:curry(file.rename,'tmp/copy.txt','read.txt')
		}
	],
	[
		curry(file.rename,'tmp','tmpNew'),
		//@todo add check that tmp does not exist as well?
		()=>file.isDir('tmpNew').then(bool=>bool===true),
		{
			name:'renameDir',
			cleanup:()=>file.delete('tmpNew').then(setup)
		}
	],
	[
		curry(file.copy,readPath,aPath),
		()=>file.readFile('tmp/a/read.txt').then(txtMatches),
		{
			name:'copyFile',
			setup:()=>file.writeDir(aPath),
			cleanup:()=>file.delete(aPath)
		}
	],
	[
		curry(file.copy,'tmp','tmpNew'),
		()=>file.readFile('tmpNew/tmp/read.txt').then(txtMatches),
		{
			name:'copyDir',
			setup:()=>file.writeDir('tmpNew'),
			cleanup:()=>file.delete('tmpNew')
		}
	],
	//@todo add checks to see that numbers time props are normalized to integers
	[
		curry(file.info,'tmp'),
		({isDir})=>isDir===true,
		'infoDir'
	],
	[
		curry(file.info,readPath),
		({isDir})=>isDir===false,
		'infoDir'
	]
],
opts={now:()=>performance.now(),parallel:false}

setup()
.then(()=>run(tests,opts))
.then(cleanup)
.catch(console.error)