with open('js/auth.js', 'r', encoding='utf8') as f:
    content = f.read()
old = 'https://auth-service.bgmi-gateway.workers.dev/api-auth'
new = 'https://auth-service.bgmi-gateway.workers.dev'
if old in content:
    content = content.replace(old, new)
    with open('js/auth.js', 'w', encoding='utf8') as f:
        f.write(content)
    print('Replaced successfully')
else:
    print('Old string not found')
    # Show what's actually there
    for i, line in enumerate(content.split('\n'), 1):
        if 'AUTH_API' in line:
            print(f'Line {i}: {repr(line)}')