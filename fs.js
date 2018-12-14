import fs from 'fs'

const
curry=(fn,...xs)=>(...ys)=>fn(...xs,...ys),
joinPath=(path,filename)=>path+(!path.match(/\/$/)?'/':'')+filename,
url2dirs=url=>url.split(/\/|\\/).filter(txt=>!!txt.length),
url2name=url=>url2dirs(url).slice(-1)[0],
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

lib.readFile=(src,encoding='utf8',...args)=>wait(fs.readFile,src,encoding,...args)

lib.copyDir=function(src,dest)
{
	const name=url2name(src)
	dest=joinPath(dest,name)

	return lib.writeDir(joinPath(dest,name))
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
	const {atime:accessed,birthtime:created,mtime:modified,ctime:changed,mode,size}=await wait(fs.lstat,src)

	return {accessed,changed,created,mode,modified,size,isDir:stats.isDirectory()}
}
lib.isDir=(...args)=>wait(fs.lstat,...args).then(stats=>stats.isDirectory())
lib.moveDir=function(src,dest)//@todo merge with copyDir
{
	const name=url2name(src)
	dest=joinPath(dest,name)

	return lib.writeDir(joinPath(dest,name))
	.then(()=>lib.readDir(src))
	.then(arr=>asyncMap(mapPath(arr,src),x=>lib.move(x,dest)))
	.then(()=>lib.deleteDir(src))
}
lib.moveFile=(src,dest)=>wait(fs.rename,src,joinPath(dest,url2name(src)))
lib.renameFile=(src,name)=>wait(fs.rename,src,joinPath(url2dirs(src),name))
lib.renameDir=function(src,name)//@todo merge with moveDir
{
	let dest=joinPath(url2dirs(src),name)

	return lib.writeDir(dest)
	.then(()=>lib.readDir(src))
	.then(arr=>asyncMap(mapPath(arr,src),item=>lib.move(item,dest)))
	.then(()=>lib.deleteDir(src))
}
lib.writeDirs=function(src)//@todo need to make sure this works
{
	return asyncMap(url2dirs(src),async function(dir,i,arr)
	{
		const
		prefix=arr.slice(0,i),
		path=prefix.concat([dir]).join('/'),
		exists=await wait(fs.lstat,path).then(()=>true).catch(()=>false)

		if(!exists) await lib.writeDir(path)
		else if(await lib.isDir(path)) throw new Error(path+' exists, but is a file')

		return dir
	})
}
;'copy,delete,move,read,rename'
.split(',')
.forEach(function(fn)
{
	lib[fn]=function(src,...args)
	{
		return lib.isDir(src)
		.then(isDir=>lib[fn+(isDir?'Dir':'File')](src,...args))
	}
})