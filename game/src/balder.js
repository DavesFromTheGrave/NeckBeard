// The Balder ceremony — the promotion review. ~10 seconds, code-cinematic.
// Triggered by a catch after surviving past the threshold. Once per run.
// Beats approved 2026-07-04: freeze → crack → gold elevator → Balder →
// Supermod sucked underground → exit → "management has been notified."
window.NB = window.NB || {};

NB.playBalderCeremony = function (scene, done) {
  const cam = scene.cameras.main;
  const mod = scene.mod.sprite;
  const W = scene.scale.width;
  const groundY = Math.min(mod.y + 60, scene.page.WORLD_H - 40);
  const elevX = Phaser.Math.Clamp(mod.x < W / 2 ? mod.x + 190 : mod.x - 190, 90, W - 90);

  scene.ceremonyRunning = true;
  scene.mod.freezeHard();

  // 1 — freeze + lens (0.8s)
  const shade = scene.add.rectangle(cam.scrollX + W / 2, cam.scrollY + scene.scale.height / 2,
    W, scene.scale.height, 0x1a1428, 0).setDepth(12);
  scene.tweens.add({ targets: shade, fillAlpha: 0.28, duration: 700 });
  cam.zoomTo(1.12, 800, 'Sine.easeInOut');

  const t = (ms, fn) => scene.time.delayedCall(ms, fn);

  // 2 — the crack (at 0.8s)
  let crackG;
  t(800, () => {
    NB.sfx.crack();
    cam.shake(420, 0.006);
    crackG = scene.add.graphics().setDepth(13);
    crackG.lineStyle(4, 0x0d0b08, 1);
    let cx = elevX - 60, cy = groundY + 8;
    crackG.beginPath(); crackG.moveTo(cx, cy);
    for (let i = 0; i < 7; i++) {
      cx += Phaser.Math.Between(12, 26);
      cy += Phaser.Math.Between(-7, 7);
      crackG.lineTo(cx, cy);
    }
    crackG.strokePath();
    for (const el of scene.page.elements) {
      if (Math.abs(el.rect.centerY - groundY) < 220) scene.page.shake(el, scene);
    }
  });

  // 3 — the elevator rises (at 2.0s)
  let elev, balder;
  t(2000, () => {
    NB.sfx.ding();
    elev = scene.page.makeElevator(elevX, groundY + 120);
    for (const o of elev) {
      scene.tweens.add({ targets: o, y: o.y - 120, duration: 1900, ease: 'Sine.easeOut' });
    }
  });

  // 4 — Balder steps out (at 4.4s)
  t(4400, () => {
    balder = scene.add.sprite(elevX, groundY - 46, 'balder')
      .setScale(1.05).setDepth(18).setAlpha(0);
    balder.setFlipX(mod.x < elevX);
    scene.tweens.add({ targets: balder, alpha: 1, x: balder.x + (mod.x < elevX ? -34 : 34), duration: 900 });
    // cigar smoke
    scene.time.addEvent({ repeat: 5, delay: 300, callback: () => {
      const puff = scene.add.circle(balder.x + (balder.flipX ? -14 : 14), balder.y - 30,
        Phaser.Math.Between(3, 5), 0xbbbbbb, 0.5).setDepth(18);
      scene.tweens.add({ targets: puff, y: puff.y - 24, alpha: 0, scale: 2, duration: 900,
        onComplete: () => puff.destroy() });
    }});
  });

  // 5 — the suck (at 6.4s)
  t(6400, () => {
    NB.sfx.gulp();
    cam.shake(300, 0.004);
    const under = scene.add.graphics().setDepth(13);
    under.lineStyle(4, 0x0d0b08, 1);
    under.beginPath(); under.moveTo(mod.x - 34, mod.y + 40);
    under.lineTo(mod.x, mod.y + 46); under.lineTo(mod.x + 34, mod.y + 40);
    under.strokePath();
    scene.mod.sprite.play('anim-stumble');
    scene.tweens.add({
      targets: mod, y: mod.y + 70, angle: 200, scale: 0.05, duration: 1100,
      ease: 'Quad.easeIn',
      onComplete: () => { mod.setVisible(false); under.destroy(); },
    });
  });

  // 6 — exit (at 8.2s)
  t(8200, () => {
    if (balder) {
      balder.setFlipX(!balder.flipX);
      scene.tweens.add({ targets: balder, x: elevX, alpha: 0.9, duration: 700 });
      scene.tweens.add({ targets: balder, alpha: 0, duration: 300, delay: 750 });
    }
    t(1100, () => {
      NB.sfx.ding();
      for (const o of (elev || [])) {
        scene.tweens.add({ targets: o, y: o.y + 120, duration: 1300, ease: 'Sine.easeIn',
          onComplete: () => o.destroy() });
      }
      if (crackG) scene.tweens.add({ targets: crackG, alpha: 0, duration: 900,
        onComplete: () => crackG.destroy() });
    });
  });

  // 7 — color back, the line, resume (at 10.6s)
  t(10600, () => {
    scene.tweens.add({ targets: shade, fillAlpha: 0, duration: 600,
      onComplete: () => shade.destroy() });
    cam.zoomTo(1, 700, 'Sine.easeInOut');
    const note = scene.add.text(W / 2, 92, 'management has been notified.', {
      fontFamily: 'Courier New', fontSize: '16px', color: '#9a3fd4',
    }).setOrigin(0.5).setDepth(30).setScrollFactor(0).setAlpha(0);
    scene.tweens.add({ targets: note, alpha: 1, duration: 500, yoyo: true, hold: 2200,
      onComplete: () => note.destroy() });
    scene.ceremonyRunning = false;
    done();
  });
};

// After the ceremony: the comeback. He crawls out of the ground as REVENANT.
NB.spawnRevenant = function (scene) {
  NB.sfx.revenant();
  const cam = scene.cameras.main;
  cam.shake(600, 0.008);
  const mod = scene.mod;
  const s = mod.sprite;
  const W = scene.scale.width;
  const x = Phaser.Math.Between(80, W - 80);
  const y = Phaser.Math.Clamp(cam.scrollY + scene.scale.height * 0.4, 100, scene.page.WORLD_H - 60);
  s.setPosition(x, y + 60).setVisible(true).setScale(0.05).setAngle(0).setAlpha(0.4);
  mod.revenant = true;
  mod.frozen = false;      // ceremony freeze ends with the resurrection
  s.anims.resume();
  // state-machine-driven rise (gameplay-critical: never trust the tween manager)
  mod.riseFrom = { y: y + 60, toY: y };
  mod.setState('RISE');
  scene.floatText(x, y - 70, 'HE CAME BACK WRONG', '#3fae54');
};
