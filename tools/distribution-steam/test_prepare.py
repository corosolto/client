import hashlib
import importlib.util
import os
import subprocess
import sys
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('prepare', Path(__file__).with_name('prepare.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PreflightTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.build = self.root / 'build'
        self.build.mkdir()
        (self.build / 'game').write_bytes(b'\x7fELFfixture-only-not-a-real-build')
        (self.build / 'game').chmod(0o755)

    def run_plan(self, **changes):
        args = dict(content=self.build, output=self.root / 'out', launch='game', platform='linux', app_id='123', depot_id='456')
        args.update(changes)
        return module.prepare(**args)

    def test_prepares_preview_and_hashes_without_upload(self):
        result = self.run_plan()
        self.assertEqual(result['files'][0]['size'], 33)
        self.assertFalse(result['uploaded'])
        self.assertFalse(result['native_runtime_tested'])
        self.assertIn('"Preview" "1"', (self.root / 'out/app-preview.vdf').read_text())
        self.assertNotIn('SetLive', (self.root / 'out/app-preview.vdf').read_text())

    def test_web_content_is_rejected(self):
        (self.build / 'game').write_text('<html>game</html>')
        with self.assertRaisesRegex(ValueError, 'Cabeçalho'):
            self.run_plan()

    def test_missing_native_and_escape_are_rejected(self):
        for launch in ('absent.exe', '../game', '/game'):
            with self.subTest(launch=launch), self.assertRaises(ValueError):
                self.run_plan(launch=launch)

    def test_symlink_and_private_config_are_rejected(self):
        link = self.build / 'outside'
        link.symlink_to('/etc/hosts')
        with self.assertRaisesRegex(ValueError, 'Symlink'):
            self.run_plan()
        link.unlink()
        (self.build / '.env.local').write_text('fixture-not-a-secret')
        with self.assertRaisesRegex(ValueError, 'privada'):
            self.run_plan()

    def test_vdf_injection_output_overlap_and_invalid_id(self):
        for changes in ({'app_id': '0'}, {'depot_id': '1"2'}, {'output': self.build / 'out'}, {'launch': 'game\n"bad"'}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                self.run_plan(**changes)

    def test_wrong_platform_or_nonexecutable_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Cabeçalho'):
            self.run_plan(platform='windows')
        (self.build / 'game').chmod(0o644)
        with self.assertRaisesRegex(ValueError, 'permissão'):
            self.run_plan()

    def test_output_symlinks_are_refused_and_targets_kept_intact(self):
        for name in ('manifest.json', 'app-preview.vdf'):
            for dangling in (False, True):
                with self.subTest(name=name, dangling=dangling):
                    out = self.root / (name + str(dangling))
                    out.mkdir()
                    target = self.root / ('missing-' + name) if dangling else self.build / 'game'
                    before = None if dangling else target.read_bytes()
                    other = out / ('app-preview.vdf' if name == 'manifest.json' else 'manifest.json')
                    other.write_text('existing-output-must-stay')
                    (out / name).symlink_to(target)
                    with self.assertRaisesRegex(ValueError, 'arquivo comum'):
                        self.run_plan(output=out)
                    self.assertTrue((out / name).is_symlink())
                    self.assertEqual(other.read_text(), 'existing-output-must-stay')
                    self.assertFalse(target.exists()) if dangling else self.assertEqual(target.read_bytes(), before)

    def test_special_fifo_in_depot_is_rejected_synchronously(self):
        os.mkfifo(self.build / 'pipe')
        result = subprocess.run([sys.executable, module.__file__, '--content', str(self.build),
                                 '--output', str(self.root / 'out'), '--launch', 'game',
                                 '--platform', 'linux', '--app-id', '123', '--depot-id', '456'],
                                capture_output=True, text=True, timeout=3)
        self.assertEqual(result.returncode, 1)
        self.assertIn('especial', result.stderr)
        self.assertFalse((self.root / 'out').exists())

    def test_digest_is_real_sha256_and_follows_bytes(self):
        payload = b'\x7fELFdigest-fixture-bytes'
        (self.build / 'game').write_bytes(payload)
        (self.build / 'game').chmod(0o755)
        result = self.run_plan()
        self.assertEqual(result['files'][0]['sha256'], hashlib.sha256(payload).hexdigest())
        (self.build / 'game').write_bytes(payload + b'x')
        (self.build / 'game').chmod(0o755)
        self.assertNotEqual(self.run_plan()['files'][0]['sha256'], hashlib.sha256(payload).hexdigest())


if __name__ == '__main__':
    unittest.main()
