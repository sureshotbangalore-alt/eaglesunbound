import urllib.request,concurrent.futures
assets={'hero':'banners/full/b277adfca3aac42c0cdf6c92251d2399.jpg','hero-2':'banners/full/1e62f260c7a44394e18a75a2dfced1e6.jpg','hero-3':'banners/full/3e2433b512fb336c4f985687188d767f.jpg','climbing':'activity/d61421bc819573fc0be33364f25ed978.jpg','ropes':'activity/2970c3582d6aa9129e422b6127b354ed.jpg','obstacles':'activity/f56944c2beb44bc1e0585589f0be5c4b.jpg','archery':'activity/57a75482df92f0fa271cdf74db55dfe1.jpg','zipline':'activity/155a3816fba121fb635d5ebf8330d596.jpg','teamwork':'activity/0771498985cc87a10853afcd48a13dc1.jpg'}
def get(item):
 n,p=item
 try:
  urllib.request.urlretrieve('https://www.eaglesunbound.com/uploads/'+p,'frontend/public/assets/'+n+'.jpg')
  return n+' downloaded'
 except Exception as e:return n+': '+str(e)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:print('\n'.join(ex.map(get,assets.items())))
