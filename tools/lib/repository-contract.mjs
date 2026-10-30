/* Bộ test hợp đồng PlayerRepository (xem server/repositories/player-repository.js).
   Dùng lại cho mọi bản cài đặt: repositoryContract(test, makeRepository), với makeRepository() trả kho mới và trống. */
import assert from 'node:assert/strict';

export function repositoryContract(test, makeRepository) {
  const fresh = async (id = 'p1') => { const repo = makeRepository(); await repo.create(id, { state: { gold: 0, items: [] } }); return repo; };

  test('create/get: bản sao độc lập, trùng id báo PLAYER_EXISTS', async () => {
    const repo = await fresh();
    const a = await repo.get('p1');
    a.state.gold = 999;
    assert.equal((await repo.get('p1')).state.gold, 0, 'sửa bản sao không đổi kho');
    assert.equal(await repo.get('khong-co'), null);
    await assert.rejects(repo.create('p1', { state: {} }), { code: 'PLAYER_EXISTS' });
  });

  test('transact: commit khi thành công và trả kết quả của fn', async () => {
    const repo = await fresh();
    const out = await repo.transact('p1', async draft => { draft.state.gold += 5; draft.revision += 1; return 'xong'; });
    assert.equal(out, 'xong');
    const r = await repo.get('p1');
    assert.equal(r.state.gold, 5);
    assert.equal(r.revision, 1);
  });

  test('transact: lỗi trong fn hoàn tác cả state lẫn sự kiện outbox, lỗi được ném nguyên vẹn', async () => {
    const repo = await fresh();
    const boom = Error('boom');
    await assert.rejects(repo.transact('p1', async draft => { draft.state.gold = 77; draft.events.push({ type: 'x' }); throw boom; }), e => e === boom);
    assert.equal((await repo.get('p1')).state.gold, 0);
    assert.deepEqual(await repo.drainOutbox(), []);
  });

  test('transact: người chơi không tồn tại → PLAYER_NOT_FOUND', async () => {
    await assert.rejects(makeRepository().transact('khong-co', async () => 1), { code: 'PLAYER_NOT_FOUND' });
  });

  test('transact: các giao dịch cùng người chơi chạy tuần tự, không mất cập nhật', async () => {
    const repo = await fresh();
    const bump = () => repo.transact('p1', async draft => {
      const seen = draft.state.gold;
      await new Promise(resolve => setTimeout(resolve, 1)); // nhường lượt để lộ race nếu có
      draft.state.gold = seen + 1;
    });
    await Promise.all(Array.from({ length: 25 }, bump));
    assert.equal((await repo.get('p1')).state.gold, 25);
  });

  test('transact: người chơi khác nhau không chặn nhau', async () => {
    const repo = makeRepository();
    await repo.create('a', { state: { n: 0 } });
    await repo.create('b', { state: { n: 0 } });
    let releaseA;
    const blocked = repo.transact('a', () => new Promise(resolve => { releaseA = resolve; }));
    await repo.transact('b', async draft => { draft.state.n = 1; });
    assert.equal((await repo.get('b')).state.n, 1);
    releaseA();
    await blocked;
  });

  test('transact: giao dịch sau vẫn chạy khi giao dịch trước thất bại', async () => {
    const repo = await fresh();
    await assert.rejects(repo.transact('p1', async () => { throw Error('hỏng'); }));
    await repo.transact('p1', async draft => { draft.state.gold = 3; });
    assert.equal((await repo.get('p1')).state.gold, 3);
  });

  test('outbox: ghi cùng giao dịch, đúng thứ tự, drain không xóa, ack mới xóa', async () => {
    const repo = await fresh();
    await repo.transact('p1', async draft => { draft.events.push({ type: 'a', payload: { n: 1 } }, { type: 'b' }); });
    await repo.transact('p1', async draft => { draft.events.push({ type: 'c' }); });
    const first = await repo.drainOutbox(2);
    assert.deepEqual(first.map(e => e.type), ['a', 'b']);
    assert.equal(first[0].playerId, 'p1');
    assert.deepEqual(first[0].payload, { n: 1 });
    assert.equal((await repo.drainOutbox(10)).length, 3, 'drain không xóa');
    await repo.ackOutbox(first.map(e => e.id));
    assert.deepEqual((await repo.drainOutbox(10)).map(e => e.type), ['c']);
    assert.equal(new Set((await repo.drainOutbox(10)).concat(first).map(e => e.id)).size, 3, 'id sự kiện duy nhất');
  });
}
