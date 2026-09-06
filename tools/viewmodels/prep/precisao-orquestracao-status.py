"""Resumo limitado da sessão Claude; não inicia, interrompe ou retoma processos."""
import json
from pathlib import Path
import subprocess

RAIZ = Path(__file__).resolve().parents[3]
PASTA = RAIZ / 'artifacts/viewmodels/prep/precisao/orquestracao'


def cauda(path, limite=131072):
    if not path.is_file():
        return ''
    with path.open('rb') as arquivo:
        arquivo.seek(max(0, path.stat().st_size - limite))
        return arquivo.read(limite).decode('utf-8', errors='replace')


def main():
    registro = json.loads((PASTA / 'claude-worker.json').read_text())
    config = json.loads(Path(registro['launch']).read_text())
    pid = registro.get('worker_pid')
    proc = subprocess.run(['ps', '-p', str(pid), '-o', 'args='], text=True,
                          capture_output=True, check=False)
    sessao = registro['session_id']
    ativo = proc.returncode == 0 and sessao in proc.stdout and 'claude' in proc.stdout
    saida = {
        'session_id': sessao, 'pid': pid, 'processo_confere': ativo,
        'cwd': registro['cwd'], 'model': registro.get('effective_model'),
        'automation_id': registro.get('automation_id'),
        'ultimas_mensagens': [], 'ferramentas_recentes': [],
    }
    log = Path(config['stdout'])
    if log.is_file():
        saida['log_bytes'] = log.stat().st_size
        saida['log_mtime'] = log.stat().st_mtime
    fim = Path(config['exit'])
    if fim.is_file():
        saida['termino'] = json.loads(fim.read_text())
    for linha in cauda(log).splitlines():
        try:
            evento = json.loads(linha)
        except ValueError:
            continue
        if evento.get('type') == 'assistant':
            for conteudo in evento.get('message', {}).get('content', []):
                if conteudo.get('type') == 'text':
                    saida['ultimas_mensagens'].append(conteudo['text'][-1200:])
                if conteudo.get('type') == 'tool_use':
                    saida['ferramentas_recentes'].append(conteudo.get('name'))
        if evento.get('type') == 'result':
            saida['resultado'] = {k: evento.get(k) for k in ('subtype', 'is_error')}
            saida['resultado']['texto'] = str(evento.get('result', ''))[-1800:]
    saida['ultimas_mensagens'] = saida['ultimas_mensagens'][-3:]
    saida['ferramentas_recentes'] = saida['ferramentas_recentes'][-10:]
    progresso = Path(registro.get('progress_path', str(Path(registro['cwd']) /
                     'artifacts/viewmodels/prep/rifles/m4-actions-c1/progress.json')))
    if progresso.is_file():
        saida['progresso'] = cauda(progresso, 6000)
    saida['stderr'] = cauda(Path(config['stderr']), 1000)
    print(json.dumps(saida, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
