"""Structured GitHub Actions YAML shared with the Node workflow guards."""

from collections.abc import Iterator, Mapping
from functools import lru_cache
import json
from pathlib import Path
import subprocess
from typing import Any


_HELPER = Path(__file__).resolve().parents[2] / 'tools/eval/workflow-yaml.mjs'


@lru_cache(maxsize=256)
def parse_workflow(source: str) -> dict[str, Any]:
    """Decode through the same YAML 1.2 loader used by the JavaScript gates."""
    try:
        result = subprocess.run(
            ['node', str(_HELPER), '--parse-stdin'],
            input=source,
            text=True,
            capture_output=True,
            check=False,
        )
    except OSError as exc:
        raise ValueError(f'não foi possível executar o parser YAML: {exc}') from exc
    if result.returncode:
        raise ValueError(result.stderr.strip() or 'parser YAML falhou sem diagnóstico')
    try:
        workflow = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise ValueError(f'parser YAML devolveu JSON inválido: {exc}') from exc
    if not isinstance(workflow, dict):
        raise ValueError('workflow precisa ser um mapa YAML')
    return workflow


def triggers(workflow: Mapping[str, Any] | None) -> set[str]:
    on = workflow.get('on') if workflow else None
    if isinstance(on, str):
        return {on}
    if isinstance(on, list):
        return {item for item in on if isinstance(item, str)}
    if isinstance(on, Mapping):
        return {str(item) for item in on}
    return set()


def jobs(workflow: Mapping[str, Any] | None) -> Mapping[str, Any]:
    value = workflow.get('jobs') if workflow else None
    return value if isinstance(value, Mapping) else {}


def steps(job: Mapping[str, Any] | None) -> list[Mapping[str, Any]]:
    value = job.get('steps') if job else None
    if not isinstance(value, list):
        return []
    return [step for step in value if isinstance(step, Mapping)]


def iter_steps(workflow: Mapping[str, Any] | None) -> Iterator[tuple[str, Mapping[str, Any]]]:
    for job_id, job in jobs(workflow).items():
        for step in steps(job):
            yield str(job_id), step


def named_step(workflow: Mapping[str, Any] | None, name: str) -> Mapping[str, Any]:
    for _, step in iter_steps(workflow):
        if step.get('name') == name:
            return step
    return {}


def read_only_permissions(value: Any) -> bool:
    """No write token at any nesting depth; malformed permissions fail closed."""
    if isinstance(value, str):
        return 'write' not in value
    if isinstance(value, Mapping):
        return all(read_only_permissions(item) for item in value.values())
    if isinstance(value, list):
        return all(read_only_permissions(item) for item in value)
    return value is None
