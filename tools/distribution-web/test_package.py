import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
import package
import itch

IDENTITY = {'git_sha': 'a' * 40, 'version': 'test'}
ITCH_WRAPPER = package.PORTAL_DIR / 'itch'


class PackageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.source = self.root / 'client'
        self.source.mkdir()
        self.put('index.html', '<base href="/"><link rel="manifest" href="/site.webmanifest"><script type="module" src="/js/main.js"></script><img src="/img/test.png">')
        self.put('site.webmanifest', '{"start_url":"/","icons":[{"src":"/img/test.png"}]}')
        self.put('js/main.js', "fetch('/img/test.png'); fetch('/api/ranking'); import './version.js';")
        self.put('js/version.js', "export const VERSION='test';")
        self.put('vendor/three.module.js', 'export const x=1;')
        self.put('css/nested/site.css', "body{background:url('/img/test.png')}")
        self.put('img/test.png', 'fake-image-fixture')
        self.put('data/catalog.json', '{"ready":true}')
        self.put('ranking/index.html', 'SSR page excluded')
        self.out = self.root / 'portal'

    def tearDown(self):
        self.temp.cleanup()

    def put(self, name, text):
        path = self.source / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)

    def build(self, output=None, portal='itch'):
        return package.bundle(self.source, output or self.out, IDENTITY, 'site', portal)

    def test_package_rewrites_only_artifact_and_verifies_zip(self):
        self.build()
        self.assertIn('href="./"', (self.out / 'site/index.html').read_text())
        self.assertIn('"src":"./img/test.png"', (self.out / 'site/site.webmanifest').read_text())
        self.assertIn("fetch('./img/test.png')", (self.out / 'site/js/main.js').read_text())
        self.assertIn("fetch('/api/ranking')", (self.out / 'site/js/main.js').read_text())
        self.assertIn("url('../../img/test.png')", (self.out / 'site/css/nested/site.css').read_text())
        self.assertTrue((self.out / 'site/data/catalog.json').is_file())
        self.assertIn('href="/"', (self.source / 'index.html').read_text())
        self.assertFalse((self.out / 'site/ranking').exists())
        report = package.verify(self.out)
        self.assertEqual((report['kind'], report['portal'], report['archive']['path']), ('site', 'itch', 'corosolto-itch.zip'))
        self.assertFalse(report['publish_ready'])

    def test_itch_wrapper_is_packaged_byte_for_byte(self):
        report = package.bundle(ITCH_WRAPPER, self.out, IDENTITY, 'wrapper', 'itch')
        with zipfile.ZipFile(self.out / 'corosolto-itch.zip') as z:
            self.assertEqual(sorted(z.namelist()), ['LICENSE', 'SOURCE.txt', 'index.html'])
            self.assertEqual(z.read('index.html'), (ITCH_WRAPPER / 'index.html').read_bytes())
        self.assertEqual(report['transformed'], [])
        self.assertTrue(report['profiles']['itch']['upload_budget_pass'])
        self.assertEqual(package.verify(self.out)['archive'], report['archive'])

    def test_deterministic_zip(self):
        first = self.build()['archive']['sha256']
        second = self.build(self.root / 'second')['archive']['sha256']
        self.assertEqual(first, second)

    def test_ceiling_is_250mb(self):
        package.teto(250_000_000, 'limite exato')
        with self.assertRaisesRegex(package.TetoExcedido, r'teto de 250 MB excedido .*250000001 bytes.*#1110'):
            package.teto(250_000_001, 'um byte acima')
        crazy = package.eligibility([{'path': 'a.bin', 'bytes': 250_000_001}])['crazygames']
        self.assertIn('250000001 bytes totais > 250000000', crazy['failures'])

    def test_mutant_over_ceiling_refused_before_writing(self):
        self.put('audio/pack.ogg', '')
        with open(self.source / 'audio/pack.ogg', 'wb') as f:
            f.truncate(package.TETO_BYTES)  # esparso: o teto é medido por stat, sem ler os bytes
        self.assertRaisesRegex(package.TetoExcedido, 'bytes da fonte', self.build)
        self.assertFalse(self.out.exists())

    def test_mutant_ceiling_on_final_bytes_removes_output(self):
        # A fonte cabe no teto; LICENSE e SOURCE.txt empurram o pacote final acima dele.
        with patch.object(package, 'TETO_BYTES', 5000):
            with self.assertRaisesRegex(package.TetoExcedido, 'extraídos'):
                self.build()
        self.assertFalse(self.out.exists())

    def test_cli_over_ceiling_exits_2_with_clear_message(self):
        self.put('video/intro.mp4', '')
        with open(self.source / 'video/intro.mp4', 'wb') as f:
            f.truncate(package.TETO_BYTES + 1)
        result = subprocess.run([sys.executable, str(HERE / 'package.py'), 'build', '--portal', 'crazygames', '--kind', 'site',
                                 '--source', str(self.source), '--output', str(self.out)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn('teto de 250 MB excedido', result.stderr)
        self.assertNotIn('Traceback', result.stderr)
        self.assertFalse(self.out.exists())

    def test_cli_portal_without_wrapper_fails_clearly(self):
        result = subprocess.run([sys.executable, str(HERE / 'package.py'), 'build', '--portal', 'crazygames',
                                 '--output', str(self.out)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertIn('não tem wrapper', result.stderr)

    def test_mutant_missing_entrypoint_rejected(self):
        (self.source / 'index.html').unlink()
        with self.assertRaisesRegex(ValueError, 'fonte incompleta'):
            self.build()

    def test_mutant_absolute_module_import_rejected(self):
        self.put('js/main.js', "import '/vendor/three.module.js';")
        with self.assertRaisesRegex(ValueError, 'import absoluto'):
            self.build()

    def test_mutant_module_relative_url_rejected(self):
        self.put('js/main.js', "new URL('/img/test.png', import.meta.url);")
        with self.assertRaisesRegex(ValueError, 'base explícita'):
            self.build()

    def test_mutant_template_import_rejected(self):
        self.put('js/main.js', 'import(`/vendor/three.module.js`);')
        with self.assertRaisesRegex(ValueError, 'import absoluto'):
            self.build()

    def test_mutant_url_whitespace_and_template_rejected(self):
        for text in ["new URL ('/img/test.png', import.meta.url);", 'new URL \n ( `/img/test.png`, import.meta.url);']:
            self.put('js/main.js', text)
            with self.assertRaisesRegex(ValueError, 'base explícita'):
                self.build(self.root / str(len(text)))

    def test_extract_reads_verified_zip_not_mutable_site(self):
        self.build()
        (self.out / 'site/js/main.js').write_text('corrupted staging')
        extracted = self.root / 'extracted'
        package.verify(self.out, extracted)
        self.assertIn("fetch('./img/test.png')", (extracted / 'js/main.js').read_text())
        with self.assertRaises(FileExistsError):
            package.verify(self.out, extracted)

    def test_mutant_symlink_rejected(self):
        (self.source / 'img/leak').symlink_to(self.root)
        with self.assertRaisesRegex(ValueError, 'symlink recusado'):
            self.build()

    def test_mutant_hidden_file_rejected(self):
        self.put('.env', 'synthetic-not-a-secret')
        with self.assertRaisesRegex(ValueError, 'oculto recusado'):
            self.build()

    def test_reject_reused_or_nested_output(self):
        self.build()
        with self.assertRaisesRegex(ValueError, 'já existe'):
            self.build()
        with self.assertRaisesRegex(ValueError, 'separados'):
            self.build(self.source / 'portal')

    def test_mutant_zip_bytes_rejected(self):
        self.build()
        with zipfile.ZipFile(self.out / 'corosolto-itch.zip', 'a') as z:
            z.writestr('injected.js', 'bad')
        with self.assertRaisesRegex(ValueError, 'ZIP divergiu'):
            package.verify(self.out)

    def test_mutant_forged_budget_rejected(self):
        self.build()
        report = json.loads((self.out / 'report.json').read_text())
        report['profiles']['itch']['limits']['files'] = 2000
        package.save_json(self.out / 'report.json', report)
        with self.assertRaisesRegex(ValueError, 'limites'):
            package.verify(self.out)

    def test_official_budget_boundaries(self):
        row = {'path': 'asset.bin', 'bytes': 50_000_001}
        self.assertFalse(package.eligibility([row])['crazygames']['upload_budget_pass'])
        row['bytes'] = 200_000_001
        self.assertFalse(package.eligibility([row])['itch']['upload_budget_pass'])
        self.assertFalse(package.eligibility([{'path': str(i), 'bytes': 1} for i in range(1001)])['itch']['upload_budget_pass'])
        self.assertFalse(package.eligibility([{'path': 'x' * 241, 'bytes': 1}])['itch']['upload_budget_pass'])

    def test_itch_plan_never_spawns_process_or_reads_key(self):
        package.bundle(ITCH_WRAPPER, self.out, IDENTITY, 'wrapper', 'itch')
        with patch('subprocess.run', side_effect=AssertionError('process forbidden')), patch.dict(os.environ, {'BUTLER_API_KEY': 'synthetic-canary'}):
            result = itch.plan(self.out, 'example/corosolto:html5', 'alpha.126')
        self.assertFalse(result['executed'])
        self.assertTrue(result['argv_for_operator_after_review'][2].endswith('corosolto-itch.zip'))
        self.assertNotIn('synthetic-canary', json.dumps(result))
        with self.assertRaises(ValueError):
            itch.plan(self.out, 'bad;touch/file:html5', 'alpha.126')

    def test_itch_plan_refuses_other_portal_package(self):
        self.build(portal='crazygames')
        with self.assertRaisesRegex(ValueError, 'não para itch'):
            itch.plan(self.out, 'example/corosolto:html5', 'alpha.126')

    def test_explicit_dry_run_required(self):
        result = subprocess.run([sys.executable, str(HERE / 'itch.py'), '--package', str(self.out), '--target', 'x/y:html5', '--version', 'v1'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn('--dry-run', result.stderr)


if __name__ == '__main__':
    unittest.main()
