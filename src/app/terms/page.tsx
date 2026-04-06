import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "利用規約 | Pitasuke",
  description: "Pitasukeの利用規約についてご説明します。",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-3 sm:px-10 sm:py-4">
          <Link href="/">
            <Image
              className="w-[130px] h-auto sm:w-[140px]"
              src="/common/logo.svg"
              alt="Pitasuke"
              width={140}
              height={40}
            />
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 mx-auto w-full max-w-3xl px-5 py-12 sm:px-10">
        <h1 className="text-2xl font-bold text-brandNavy mb-2">利用規約</h1>
        <p className="text-xs text-brandGray mb-10">施行日: 2026年4月1日</p>

        <div className="space-y-10 text-sm leading-7 text-brandNavy">
          <p>
            本利用規約（以下「本規約」）は、Pitasuke（以下「当社」）が提供する面接日程調整サービス「Pitasuke」（以下「本サービス」）の利用条件を定めるものです。ユーザーの皆さまには、本規約に同意いただいた上で本サービスをご利用いただきます。
          </p>

          <section>
            <h2 className="text-base font-bold mb-3">第1条（適用）</h2>
            <p>
              本規約は、ユーザーと当社との間の本サービスの利用に関わる一切の関係に適用されます。当社は本サービスに関し、本規約のほか、ご利用にあたってのルールを定めることがあります。これらのルールは、その名称のいかんにかかわらず、本規約の一部を構成するものとします。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3">第2条（利用登録）</h2>
            <p>
              本サービスへの登録を希望する方は、本規約に同意の上、当社の定める方法によって利用登録の申請を行うものとします。当社は、登録申請者に以下の事由があると判断した場合、登録申請を承認しないことがあります。
            </p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-sm text-brandNavy/80">
              <li>虚偽の事項を届け出た場合</li>
              <li>本規約に違反したことがある者からの申請である場合</li>
              <li>その他、当社が登録を適当でないと判断した場合</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3">第3条（禁止事項）</h2>
            <p>ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-sm text-brandNavy/80">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>当社のサーバーまたはネットワークの機能を破壊・妨害する行為</li>
              <li>当社のサービス運営を妨害するおそれのある行為</li>
              <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
              <li>不正アクセスをし、またはこれを試みる行為</li>
              <li>他のユーザーに成りすます行為</li>
              <li>当社のサービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為</li>
              <li>その他、当社が不適切と判断する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3">第4条（本サービスの中断・終了）</h2>
            <p>
              当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができます。
            </p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-sm text-brandNavy/80">
              <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
              <li>地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合</li>
              <li>コンピュータまたは通信回線等が事故により停止した場合</li>
              <li>その他、当社が本サービスの提供が困難と判断した場合</li>
            </ul>
            <p className="mt-3">
              当社は、本サービスの提供の停止または中断により、ユーザーまたは第三者が被ったいかなる不利益または損害についても、責任を負わないものとします。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3">第5条（免責事項）</h2>
            <p>
              当社は、本サービスに関してユーザーと他のユーザーまたは第三者との間において生じた取引・連絡または紛争等について一切責任を負いません。また、当社の都合により本サービスの内容を変更または終了した場合にも、当社はユーザーへの責任を一切負いません。
            </p>
            <p className="mt-3">
              当社は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティ上の欠陥、エラーやバグなど）がないことを明示的にも黙示的にも保証しておりません。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3">第6条（利用料金）</h2>
            <p>
              本サービスの利用料金は、当社が別途定める料金プランに従います。料金プランは当社ウェブサイトに掲載し、当社はユーザーへの事前通知のうえ料金プランを変更することがあります。無料プランが提供される場合、その機能・制限は当社が随時定めるものとします。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3">第7条（準拠法・管轄裁判所）</h2>
            <p>
              本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 text-center text-xs text-brandGray/60">
        &copy; 2026 Pitasuke. All rights reserved.
      </footer>
    </div>
  );
}
