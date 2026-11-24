import json,sys,os,re
bad=[]
def strip_comments(s):
    # remove // and /* */ comments outside strings
    out=[];i=0;n=len(s);ins=False
    while i<n:
        c=s[i]
        if ins:
            out.append(c)
            if c=='\\': out.append(s[i+1]); i+=2; continue
            if c=='"': ins=False
            i+=1; continue
        if c=='"': ins=True; out.append(c); i+=1; continue
        if s.startswith('//',i):
            j=s.find('\n',i); i=n if j<0 else j; continue
        if s.startswith('/*',i):
            j=s.find('*/',i); i=n if j<0 else j+2; continue
        out.append(c); i+=1
    return ''.join(out)
for root,_,fs in os.walk(sys.argv[1]):
    for f in fs:
        if f.endswith('.json') or f.endswith('.material'):
            p=os.path.join(root,f)
            raw=open(p,'rb').read()
            try:
                t=raw.decode('utf-8-sig')
            except Exception as e:
                bad.append((p,'encoding '+str(e))); continue
            try: json.loads(t)
            except Exception as e:
                try:
                    t2=strip_comments(t); t2=re.sub(r',(\s*[}\]])',r'\1',t2); json.loads(t2); bad.append((p,'LENIENT-ONLY: '+str(e)))
                except Exception as e2: bad.append((p,'INVALID: '+str(e2)))
for b in bad: print(b)
print(len(bad))
