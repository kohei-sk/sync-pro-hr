import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "プライバシーポリシー | Pitasuke",
  description: "Pitasukeのプライバシーポリシーについてご説明します。",
};

export default function PrivacyPage() {
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
        <h1 className="text-2xl font-bold text-brandNavy mb-2">プライバシーポリシー</h1>
        <p className="text-xs text-brandGray mb-10">施行日: 2026年4月1日</p>

        <div className="space-y-10 text-sm leading-7 text-brandNavy">
          <p>
            Pitasuke（以下「当社」）は、ユーザーの個人情報の取り扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」）を定めます。
          </p>

          <section>
            <h2 className="text-base font-bold mb-3">第1条（個人情報の定義）</h2>
            <p>
              本ポリシーにおける「個人情報」とは、個人情報の保護に関する法律（以下「個人情報保護法」）に定める個人情報を指し、氏名、メールアドレス、電話番号など、特定の個人を識別できる情報を意味します。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3">第2条（個人情報の収集・利用目的）</h2>
            <p>当社は、以下の目的のために個人情報を収集・利用します。</p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-sm text-brandNavy/80">
              <li>本サービスの提供および運営</li>
              <li>ユーザー認証・アカウント管理</li>
              <li>サービスに関する通知（リマインダーメール・確認メールの送信）</li>
              <li>お問い合わせへの対応</li>
              <li>サービス品質の改善および新機能の開発</li>
              <li>利用規約への違反行為の調査</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3">第3条（第三者提供の禁止）</h2>
            <p>
              当社は、以下の場合を除き、ユーザーの同意なく個人情報を第三者に提供しません。
            </p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-sm text-brandNavy/80">
              <li>法令に基づく場合</li>
              <li>人の生命・身体・財産の保護のために必要があり、本人の同意を得ることが困難な場合</li>
              <li>公衆衛生の向上または児童の健全育成のために特に必要があり、本人の同意を得ることが困難な場合</li>
              <li>
                国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3">第4条（Cookie・アクセス解析について）</h2>
            <p>
              当社のサービスでは、利便性向上およびアクセス解析のためにCookieを使用することがあります。ブラウザの設定によりCookieの受け取りを拒否することができますが、その場合にはサービスの一部機能が利用できなくなる場合があります。
            </p>
            <p className="mt-3">
              また、当社はGoogle Analyticsなどのアクセス解析ツールを使用する場合があります。収集されるデータは匿名化されており、個人を特定するものではありません。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3">第5条（情報の安全管理）</h2>
            <p>
              当社は、収集した個人情報の漏洩・滅失・毀損の防止その他個人情報の安全管理のために、適切な技術的・組織的対策を講じます。個人情報の取り扱いを外部委託する場合は、委託先に対して適切な安全管理を求めます。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3">第6条（個人情報の開示・訂正・削除）</h2>
            <p>
              ユーザーは、当社が保有する自己の個人情報について、開示・訂正・追加・削除・利用停止を請求することができます。ご請求の際は、本人確認を行ったうえで、合理的な期間内に対応いたします。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3">第7条（プライバシーポリシーの変更）</h2>
            <p>
              当社は、法令変更への対応や業務上の必要性に応じて、本ポリシーを改定することがあります。重要な変更がある場合は、サービス上またはメールにて通知します。改定後の本ポリシーは、当該ページに掲載した時点から効力を生じます。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3">第8条（お問い合わせ）</h2>
            <p>
              本ポリシーに関するお問い合わせは、サービス内のお問い合わせフォームよりご連絡ください。
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
