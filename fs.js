import fs from 'fs'

const
curry=(fn,...xs)=>(...ys)=>fn(...xs,...ys),
joinPath=(path,filename)=>path+(!path.match(/\/$/)?'/':'')+filename,
url2path=url=>url.split(/\/|\\/).filter(txt=>!!txt.length),
url2dirs=url=>url2path(url).slice(0,-1),
url2name=url=>url2path(url).slice(-1)[0],
url2volume=url=>url.split(':')[0],
wait=function(fn,...args)
{
	return new Promise((res,rej)=>fn(...args,(err,rtn)=>err?rej(err):res(rtn)))
},
asyncMap=function(arr,fn)
{
	return arr.reduce
	(
		async (arr,...args)=>[...await arr,await fn(...args)],
		Promise.resolve([])
	)
},
mapPath=(arr,src)=>arr.map(x=>joinPath(src,x)),
setup=fn=>curry(wait,fn),
lib=Object.entries(
{
	deleteFile:fs.unlink,

	readDir:fs.readdir,//src,{encoding,withFileTypes}

	writeDir:fs.mkdir,//src
	writeFile:fs.writeFile//src,data,{encoding}
})
.map(([name,fn])=>[name,setup(fn)])
.reduce((obj,[name,fn])=>Object.assign(obj,{[name]:fn}),{})

export default lib

lib.util={joinPath,url2path,url2dirs,url2name,url2volume}

lib.readFile=(src,encoding='utf8',...args)=>wait(fs.readFile,src,encoding,...args)

lib.copyDir=function(src,dest)
{//@todo + check to make sure folder is not coied inside itself as that would cause an infinite loop
	dest=joinPath(dest,url2name(src))

	return lib.writeDir(dest)
	.then(()=>lib.readDir(src))
	.then(arr=>asyncMap(mapPath(arr,src),x=>lib.copy(x,dest)))
}
//modified times are different than native copy
lib.copyFile=function(src,dest)
{
	dest=joinPath(dest,url2name(src))//@todo make this standalone

	return new Promise(function(res,rej)
	{
		const
		rd=fs.createReadStream(src),
		wr=fs.createWriteStream(dest)

		;[rd,wr].map(stream=>stream.on('error',rej))
		wr.on('close',res)
		rd.pipe(wr)
	})
}
lib.deleteDir=function(src)
{
	return lib.readDir(src)
	.then(arr=>asyncMap(mapPath(arr,src),x=>lib.delete(x)))
	.then(()=>wait(fs.rmdir,src))
}
lib.info=async function(src)
{//@todo +catch()
	const
	stats=await wait(fs.lstat,src),
	isDir=stats.isDirectory(),
	{atime,birthtime,mtime,ctime,mode,size}=stats,
	[accessed,changed,created,modified]=
		[atime,ctime,birthtime,mtime]
		.map(date=>date.valueOf())

	return {accessed,changed,created,mode,modified,size,isDir}
}
lib.isDir=(...args)=>wait(fs.lstat,...args).then(stats=>stats.isDirectory())
lib.moveDir=function(src,dest)//@todo merge with copyDir
{
	dest=joinPath(dest,url2name(src))

	return lib.writeDir(dest)
	.then(()=>lib.readDir(src))
	.then(arr=>asyncMap(mapPath(arr,src),x=>lib.move(x,dest)))
	.then(()=>lib.deleteDir(src))
}
lib.moveFile=(src,dest)=>wait(fs.rename,src,joinPath(dest,url2name(src)))
lib.path=url=>wait(fs.realpath,url)
lib.rename=lib.renameDir=lib.renameFile=
(src,name)=>wait(fs.rename,src,url2dirs(src).concat(name).join('/'))
lib.writeDirs=function(src)//@todo need to make sure this works
{
	return asyncMap(url2path(src),async function(dir,i,arr)
	{
		const
		prefix=arr.slice(0,i),
		path=prefix.concat([dir]).join('/'),
		exists=await wait(fs.lstat,path).then(()=>true).catch(()=>false)

		if(!exists) await lib.writeDir(path)
		else if(await lib.isDir(path).then(bool=>!bool)) throw new Error(path+' exists, but is a file')

		return dir
	})
}
;'copy,delete,move,read'
.split(',')
.forEach(function(fn)
{
	lib[fn]=function(src,...args)
	{
		return lib.isDir(src)
		.then(isDir=>lib[fn+(isDir?'Dir':'File')](src,...args))
	}
})