import file from '../fs.js'
import {performance} from 'perf_hooks'
import run from '../../cherub/index.js'

const
dirTmp=['read.txt'],
readTxt='some text',
cleanup=()=>file.delete('tmp'),
setup=()=>file.writeDir('tmp').then(()=>file.writeFile('tmp/read.txt',readTxt)),
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

		curry(file.move,'tmp/read.txt','tmp/a/'),
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
	],
	[
		curry(file.move,'tmp','tmpNew'),
		()=>file.readFile('tmpNew/tmp/read.txt').then(txt=>txt===readTxt),
		{
			name:'moveDir',
			cleanup:()=>file.delete('tmpNew').then(setup),
			setup:()=>file.writeDir('tmpNew')
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
		curry(file.rename,'tmp','tmpNew'),
		//@todo add check that tmp does not exist as well?
		()=>file.isDir('tmpNew').then(bool=>bool===true),
		{
			name:'renameDir',
			cleanup:()=>file.delete('tmpNew').then(setup)
		}
	]

	// @todo lib.copyDir (copy tmp into itself)
	// lib.copyFile
	// lib.info (on dir and a file)'

	// copy (on both dir & file, or update prev tests to use these methods instead)
],
opts={now:()=>performance.now(),parallel:false}

setup()
.then(()=>run(tests,opts))

.then(cleanup)
.catch(console.error)